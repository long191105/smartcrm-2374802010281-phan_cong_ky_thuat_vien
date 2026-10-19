require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createPool } = require('./pool');

const sourceDirectory = process.env.DATASET_DIR
  ? path.resolve(process.env.DATASET_DIR)
  : path.join(__dirname, '..', '..', 'data', 'raw', 'dataset');
const batchSize = 250;

function parseCsv(text, filename) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (quoted) {
      if (character === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error(`${filename} contains an unterminated quoted CSV field.`);
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== '')) rows.push(row);
  }
  if (rows.length < 2) {
    throw new Error(`${filename} must contain a header and at least one data row.`);
  }

  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, '').trim());
  return rows.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(
        `${filename} row ${index + 2} has ${values.length} values; expected ${headers.length}.`,
      );
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function readCsv(filename) {
  return parseCsv(
    fs.readFileSync(path.join(sourceDirectory, filename), 'utf8'),
    filename,
  );
}

function requiredMap(rows, key, value, filename) {
  const result = new Map(rows.map((row) => [row[key], row[value]]));
  if (result.size !== rows.length) {
    throw new Error(`${filename} contains duplicate ${key} values.`);
  }
  return result;
}

function requiredNumber(value, column, filename) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`${filename}: invalid ${column} value "${value}".`);
  }
  return number;
}

function requiredBoolean(value, column, filename) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${filename}: invalid ${column} boolean "${value}".`);
}

function timestamp(value, column, filename) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) {
    return `${value.replace(' ', 'T')}+07:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  throw new Error(`${filename}: invalid ${column} timestamp "${value}".`);
}

async function insertRows(client, { table, columns, rows, conflictColumn }) {
  let imported = 0;
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values = [];
    const placeholders = batch.map((row, rowIndex) => {
      const tuple = row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });
      return `(${tuple.join(', ')})`;
    });
    const result = await client.query(
      `INSERT INTO ${table} (${columns.join(', ')})
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (${conflictColumn}) DO NOTHING`,
      values,
    );
    imported += result.rowCount;
  }
  return imported;
}

async function importDataset(pool) {
  const centerRows = readCsv('service_centers.csv');
  const categoryRows = readCsv('issue_categories.csv');
  const technicianRows = readCsv('technicians.csv');
  const skillRows = readCsv('technician_skills.csv');
  const ticketRows = readCsv('tickets_history.csv');
  const statusRows = readCsv('ticket_status_log.csv');
  const centers = requiredMap(centerRows, 'center_id', 'center_code', 'service_centers.csv');
  const categories = requiredMap(
    categoryRows,
    'category_id',
    'category_name',
    'issue_categories.csv',
  );
  const technicianIds = new Set(technicianRows.map((row) => row.technician_id));
  const now = new Date().toISOString();
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const counts = {};
    counts.technicians = await insertRows(client, {
      table: 'technician',
      columns: [
        'technician_id', 'technician_code', 'full_name', 'center_code', 'level', 'is_active',
      ],
      conflictColumn: 'technician_id',
      rows: technicianRows.map((row) => {
        const centerCode = centers.get(row.center_id);
        if (!centerCode) {
          throw new Error(`Unknown center_id ${row.center_id} in technicians.csv.`);
        }
        return [
          requiredNumber(row.technician_id, 'technician_id', 'technicians.csv'),
          row.technician_code,
          row.ho_ten,
          centerCode,
          row.level,
          requiredBoolean(row.is_active.toLowerCase(), 'is_active', 'technicians.csv'),
        ];
      }),
    });

    counts.skills = await insertRows(client, {
      table: 'technician_skill',
      columns: ['technician_id', 'category_name', 'proficiency'],
      conflictColumn: 'technician_id, category_name',
      rows: skillRows.map((row) => {
        const categoryName = categories.get(row.category_id);
        if (!technicianIds.has(row.technician_id) || !categoryName) {
          throw new Error(`Unknown technician/category in technician_skills.csv.`);
        }
        return [
          requiredNumber(row.technician_id, 'technician_id', 'technician_skills.csv'),
          categoryName,
          requiredNumber(row.proficiency, 'proficiency', 'technician_skills.csv'),
        ];
      }),
    });

    const ticketData = ticketRows.map((row) => {
      const centerCode = centers.get(row.center_id);
      const categoryName = categories.get(row.category_id);
      if (!centerCode || !categoryName) {
        throw new Error(`Unknown center/category in tickets_history.csv for ${row.ticket_code}.`);
      }
      if (row.technician_id && !technicianIds.has(row.technician_id)) {
        throw new Error(`Unknown technician_id in tickets_history.csv for ${row.ticket_code}.`);
      }
      return {
        values: [
          requiredNumber(row.ticket_id, 'ticket_id', 'tickets_history.csv'),
          row.ticket_code,
          requiredNumber(row.customer_id, 'customer_id', 'tickets_history.csv'),
          requiredNumber(row.product_id, 'product_id', 'tickets_history.csv'),
          row.serial_no,
          centerCode,
          categoryName,
          row.priority,
          row.status,
          row.issue_desc || null,
          timestamp(row.received_at, 'received_at', 'tickets_history.csv'),
          timestamp(row.due_date, 'due_date', 'tickets_history.csv'),
          timestamp(row.closed_at, 'closed_at', 'tickets_history.csv'),
          requiredBoolean(row.is_warranty.toLowerCase(), 'is_warranty', 'tickets_history.csv'),
        ],
        ticketId: row.ticket_id,
        technicianId: row.technician_id,
        status: row.status,
        receivedAt: timestamp(row.received_at, 'received_at', 'tickets_history.csv'),
        closedAt: timestamp(row.closed_at, 'closed_at', 'tickets_history.csv'),
      };
    });
    counts.tickets = await insertRows(client, {
      table: 'ticket',
      columns: [
        'ticket_id', 'ticket_code', 'customer_id', 'product_id', 'serial_no', 'center_code',
        'category_name', 'priority', 'status', 'issue_desc', 'received_at', 'due_date',
        'closed_at', 'is_warranty',
      ],
      conflictColumn: 'ticket_id',
      rows: ticketData.map((row) => row.values),
    });

    const assignments = ticketData
      .filter((row) => row.technicianId
        && ['DA_PHAN_CONG', 'DANG_XU_LY', 'CHO_LINH_KIEN'].includes(row.status))
      .map((row) => [
        requiredNumber(row.ticketId, 'ticket_id', 'tickets_history.csv'),
        requiredNumber(row.technicianId, 'technician_id', 'tickets_history.csv'),
        row.receivedAt || now,
      ]);
    for (let start = 0; start < assignments.length; start += batchSize) {
      const batch = assignments.slice(start, start + batchSize);
      const values = [];
      const tuples = batch.map((row) => {
        const offset = values.length;
        values.push(...row);
        return `($${offset + 1}::BIGINT, $${offset + 2}::BIGINT, $${offset + 3}::TIMESTAMPTZ)`;
      });
      const result = await client.query(
        `INSERT INTO ticket_assignment (ticket_id, technician_id, assigned_by, assigned_at)
         SELECT source.ticket_id, source.technician_id, 'dataset-current', source.assigned_at
         FROM (VALUES ${tuples.join(', ')}) AS source(ticket_id, technician_id, assigned_at)
         WHERE NOT EXISTS (
           SELECT 1 FROM ticket_assignment AS existing
           WHERE existing.ticket_id = source.ticket_id
             AND existing.technician_id = source.technician_id
             AND existing.assigned_at = source.assigned_at
         )`,
        values,
      );
      counts.assignments = (counts.assignments || 0) + result.rowCount;
    }

    const validTicketIds = new Set(ticketRows.map((row) => row.ticket_id));
    counts.statusLogs = await insertRows(client, {
      table: 'ticket_status_log',
      columns: [
        'log_id', 'ticket_id', 'from_status', 'to_status', 'changed_at', 'changed_by', 'note',
      ],
      conflictColumn: 'log_id',
      rows: statusRows.map((row) => {
        if (!validTicketIds.has(row.ticket_id)) {
          throw new Error(`Unknown ticket_id ${row.ticket_id} in ticket_status_log.csv.`);
        }
        return [
          requiredNumber(row.log_id, 'log_id', 'ticket_status_log.csv'),
          requiredNumber(row.ticket_id, 'ticket_id', 'ticket_status_log.csv'),
          row.from_status || null,
          row.to_status,
          timestamp(row.changed_at, 'changed_at', 'ticket_status_log.csv'),
          row.changed_by,
          row.note || null,
        ];
      }),
    });

    await client.query(
      `SELECT setval(
         pg_get_serial_sequence('ticket_status_log', 'log_id'),
         GREATEST((SELECT COALESCE(MAX(log_id), 1) FROM ticket_status_log), 1)
       )`,
    );
    await client.query('COMMIT');
    transactionStarted = false;
    return {
      sourceDirectory,
      sourceRows: {
        centers: centerRows.length,
        categories: categoryRows.length,
        technicians: technicianRows.length,
        skills: skillRows.length,
        tickets: ticketRows.length,
        statusLogs: statusRows.length,
      },
      inserted: counts,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Dataset import failed and the database transaction could not be rolled back.',
        );
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  (async () => {
    const pool = createPool();
    try {
      const result = await importDataset(pool);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Dataset import failed:', error.message);
      process.exitCode = 1;
    } finally {
      try {
        await pool.end();
      } catch (error) {
        console.error('Could not close database pool:', error.message);
        process.exitCode = 1;
      }
    }
  })();
}

module.exports = { importDataset, parseCsv };
