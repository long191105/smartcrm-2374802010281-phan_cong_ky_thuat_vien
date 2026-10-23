export function createResource(loader) {
  const resource = {
    state: 'loading',
    data: null,
    error: null,
    async load() {
      resource.state = 'loading';
      resource.error = null;
      try {
        resource.data = await loader();
        resource.state = resource.data?.items?.length === 0 ? 'empty' : 'ready';
      } catch (error) {
        resource.error = error;
        resource.state = 'error';
      }
      return resource;
    },
  };
  return resource;
}

export async function fetchResource(loader) {
  return createResource(loader).load();
}
