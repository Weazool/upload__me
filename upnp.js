import { Client } from '@runonflux/nat-upnp';

let client = null;
let mappedPort = null;

export async function createMapping(port) {
  client = new Client();
  try {
    await client.createMapping({
      public: port,
      private: port,
      ttl: 0,
      description: 'upload-me-temp',
      protocol: 'TCP',
    });
    mappedPort = port;
    const ip = await client.getPublicIp();
    return { success: true, externalIp: ip, port };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function removeMapping() {
  if (!client || mappedPort === null) return;
  try {
    await client.removeMapping({ public: mappedPort, protocol: 'TCP' });
  } catch {
    // best-effort cleanup
  } finally {
    client.close();
    client = null;
    mappedPort = null;
  }
}
