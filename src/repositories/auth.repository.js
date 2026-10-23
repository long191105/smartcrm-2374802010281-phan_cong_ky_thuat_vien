class AuthRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findUserByUsername(username) {
    const result = await this.pool.query(
      `SELECT user_id, username, display_name, password_hash
       FROM auth_user
       WHERE username = $1`,
      [username],
    );
    return result.rows[0] || null;
  }

  async createSession(userId, tokenHash, expiresAt) {
    await this.pool.query('DELETE FROM auth_session WHERE expires_at <= NOW()');
    await this.pool.query(
      `INSERT INTO auth_session (session_token_hash, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [tokenHash, userId, expiresAt],
    );
  }

  async findActiveSession(tokenHash) {
    const result = await this.pool.query(
      `SELECT u.user_id, u.username, u.display_name
       FROM auth_session s
       JOIN auth_user u ON u.user_id = s.user_id
       WHERE s.session_token_hash = $1 AND s.expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] || null;
  }

  async deleteSession(tokenHash) {
    await this.pool.query(
      'DELETE FROM auth_session WHERE session_token_hash = $1',
      [tokenHash],
    );
  }

  async upsertBootstrapUser({ username, displayName, passwordHash }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO auth_user (username, display_name, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (username) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             password_hash = EXCLUDED.password_hash
         RETURNING user_id, username, display_name`,
        [username, displayName, passwordHash],
      );
      await client.query(
        'DELETE FROM auth_session WHERE user_id = $1',
        [result.rows[0].user_id],
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { AuthRepository };
