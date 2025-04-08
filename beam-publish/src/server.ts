import express, { Request, Response } from 'express';
// import { Fabric } from '@spacesprotocol/fabric';
import {Fabric} from '../index';
// import { AnchorStore } from '@spacesprotocol/fabric/dist/anchor';
import { AnchorStore } from '../anchor';
import dns from 'dns-packet';
import { Buffer } from 'buffer';
import {log, NostrEvent, validateEvent} from '../utils';
import fs from 'fs';
import {DNS_EVENT_KIND} from '../constants';
import c from 'compact-encoding';
import b4a from 'b4a';
import {compactEvent} from '../messages';

const app = express();
const port = 3000;

// Create Fabric instance with anchor setup
let fabric: InstanceType<typeof Fabric>;

// Initialize Fabric
async function initFabric(): Promise<void> {
  try {
    fabric = new Fabric({
      anchor: await AnchorStore.create({
        // localPath: 'data/root-anchors.json'
        remoteUrls: ['http://70.251.209.207:7225/root-anchors.json']
      })
    });
    
    await fabric.ready();
    console.log('Fabric initialized');
  } catch (error) {
    console.error('Failed to initialize Fabric:', error);
    throw error;
  }
}

function createFabric(opts: any): Fabric {
  return fabric;
}

interface ResolveZoneResponse {
  zone: dns.Packet;
  space: string;
  closestNodes: any[];
  size: number;
  signature: Buffer;
  proof: Buffer;
  peer: any;
  qname?: string,
  qtypes?: string[];
  qtime: string;
  elapsed: number;
}


class Beam {
  fabric: Fabric;

  public static async create(opts: any): Promise<Beam> {
    const fabric = createFabric(opts);
    return new Beam(fabric);
  }

  private constructor(fabric: Fabric) {
    this.fabric = fabric;
  }

  async ready(): Promise<void> {
    await this.fabric.ready();
  }

  // async connect(space: string, path: string): Promise<void> {
  //   try {
  //     const {zone} = await this.resolveZone(space, true);
  //     if (!zone.authorities) throw new Error('Expected an authorities section in the DNS update packet');
  //     const dnslink = zone.authorities.find(a => a.type === 'TXT' && a.name === '_dnslink.' + space);
  //     // @ts-ignore
  //     let data = dnslink?.data.toString();
  //     const prefix = 'dnslink=/fabric/';
  //     if (!data || data.length !== prefix.length + 64 || !data.startsWith(prefix)) {
  //       console.error('Unsupported dnslink record:', data);
  //       return;
  //     }
  //     data = data.slice(prefix.length);

  //     console.log('; NOISE ADDRESS:', data);
  //     const pubkey = Buffer.from(data, 'hex');
  //     const encryptedSocket = this.fabric.connect(pubkey);

  //     encryptedSocket.on('open', () => {
  //       console.log('; ENCRYPTED NOISE CONNECTION ESTABLISHED');
  //       console.log(`; GET ${path}`);
  //       encryptedSocket.write(`GET ${path} HTTP/1.1\r\n\r\n`);
  //     });

  //     encryptedSocket.on('error', (err: Error) => {
  //       console.log('; CONNECTION ERROR:', err);
  //     });

  //     encryptedSocket.on('close', () => {
  //       console.log('; CONNECTION TERMINATED');
  //       process.exit(0);
  //     });

  //     let head: Buffer | null = null;
  //     encryptedSocket.on('data', (data: Buffer) => {
  //       if (!head) {
  //         const idx = data.indexOf('\r\n\r\n');
  //         if (idx === -1) {
  //           console.error('; GOT MALFORMED RESPONSE');
  //           encryptedSocket.end();
  //           return;
  //         }

  //         head = data.slice(0, idx);
  //         data = data.slice(idx);

  //         const extractProto = () => {
  //           const idx = head!.indexOf('\r\n');
  //           if (idx === -1) return null;
  //           const [proto, statusCode, ...statusMessage] = head!.slice(0, idx).toString().split(' ');
  //           return {proto, statusCode, message: statusMessage.join(' ')};
  //         };

  //         const header = (key: string) => {
  //           const kIdx = head!.indexOf(`${key}:`);
  //           const vIdx = kIdx !== -1 ? head!.indexOf('\r\n', kIdx) : -1;
  //           return vIdx !== -1 ? head!.slice(head!.indexOf(':', kIdx) + 1, vIdx).toString().trim() : null;
  //         };

  //         const {proto, statusCode, message} = extractProto()!;
  //         if (!proto || proto !== 'HTTP/1.1') {
  //           console.error('; GOT MALFORMED RESPONSE');
  //           encryptedSocket.end();
  //           return;
  //         }
  //         if (statusCode !== '200') {
  //           console.error(`; GOT STATUS: ${statusCode} ${message}`);
  //           encryptedSocket.end();
  //           return;
  //         }
  //       }

  //       console.log(data.toString().trim());
  //       encryptedSocket.end();
  //     });

  //     encryptedSocket.on('end', () => {
  //       encryptedSocket.end();
  //     });

  //     await new Promise(() => {
  //     });
  //   } catch (e) {
  //     console.error('; ERROR connecting: ', (e as Error).message);
  //     await this.destroy();
  //   }
  // }

  // async serve(dir: string): Promise<any> {
  //   let keypair: KeyPair | null;
  //   dir = resolve(dir);
  //   console.log(`; ${beamTitle} serving dir=${dir}`);
  //   const first = !fs.existsSync('beam.keypair.json');

  //   if (first) {
  //     console.log('; No beam.keypair.json file found - creating one...');
  //     await this.keyGen();
  //   }

  //   try {
  //     const keypairJson = JSON.parse(fs.readFileSync('beam.keypair.json').toString());
  //     if (first) {
  //       console.log('; KEYPAIR PUBKEY:', keypairJson.publicKey);
  //       console.log('; Add this record to your zone file and publish it to the network:');
  //       console.log('_dnslink 300 CLASS2 TXT "dnslink=/fabric/' + keypairJson.publicKey + '"');
  //     }
  //     keypair = {
  //       publicKey: Buffer.from(keypairJson.publicKey, 'hex'),
  //       secretKey: Buffer.from(keypairJson.secretKey, 'hex')
  //     };
  //   } catch (e) {
  //     console.error('Failed to read beam.keypair.json file:', (e as Error).message);
  //     return;
  //   }

  //   const firewall = (pub: Buffer, remotePayload: any, addr: any): boolean => {
  //     return false;
  //   };

  //   const server = this.fabric.createServer({firewall}, async (socket: any) => {
  //     const log = (level: string, message: string) => {
  //       console.log(`[${new Date().toISOString()} ${level} server] ${socket.rawStream?.remoteHost}:${socket.rawStream?.remotePort} ${message}`);
  //     };

  //     const info = (message: string) => log('INFO', message);
  //     const error = (message: string) => log('ERR', message);

  //     info('Connection established');
  //     try {
  //       socket.on('error', error);
  //       socket.on('data', (data: Buffer) => {
  //         const response = (status: string, body: string | Buffer): string => {
  //           info(`${status}`);
  //           return `HTTP/1.1 ${status}\r\nContent-Type: text/plain\r\nContent-Length: ${body.length}\r\n\r\n${body}`;
  //         };

  //         const request = data.toString();
  //         const [requestLine, ...headers] = request.split('\r\n');
  //         let [method, path, protocol] = requestLine.split(' ');
  //         info(`${method} ${path}`);
  //         if (protocol !== 'HTTP/1.1') {
  //           socket.write(response('400 Bad Request', ''));
  //           socket.end();
  //           return;
  //         }
  //         if (path === '') path = 'index.txt';
  //         path = basename(path);
  //         if (method !== 'GET') {
  //           socket.write(response('405 Method Not Allowed', ''));
  //           socket.end();
  //           return;
  //         }
  //         path = resolve(dir, path);
  //         if (!path.startsWith(dir)) {
  //           socket.write(response('403 Forbidden', ''));
  //           socket.end();
  //           return;
  //         }
  //         if (!fs.existsSync(path)) {
  //           socket.write(response('404 Not Found', ''));
  //           socket.end();
  //           return;
  //         }
  //         const content = fs.readFileSync(path);

  //         socket.write(response('200 OK', content));
  //         socket.end();
  //       });
  //     } catch (e) {
  //       console.error('Error writing to connection:', (e as Error).message);
  //     }
  //   });

  //   await server.listen(keypair);
  //   return server;
  // }

  async destroy(): Promise<void> {
    await this.fabric.destroy();
  }

  async keyGen(): Promise<void> {
    const pair = Fabric.keyPair();
    const beamPair = {
      publicKey: Buffer.from(pair.publicKey).toString('hex'),
      secretKey: Buffer.from(pair.secretKey).toString('hex')
    };

    fs.writeFileSync('beam.keypair.json', JSON.stringify(beamPair, null, 2));
  }

  // async resolveZone(space: string, latest: boolean = false): Promise<ResolveZoneResponse> {
  //   const start = performance.now();
  //   const qtime = now();
  //   const res = await this.fabric.eventGet(space, DNS_EVENT_KIND, '', {latest});
  //   const elapsed = performance.now() - start;

  //   if (!res) throw new Error('No records found');

  //   const {event, from, closestNodes} = res;
  //   const encoded = c.encode(compactEvent, event);
  //   const zone = dns.decode(event.binary_content ? event.content : b4a.from(b4a.from(event.content).toString('utf-8'), 'base64'));
  //   if (!zone) {
  //     throw new Error('Failed to decode dns packet');
  //   }

  //   return {
  //     zone,
  //     space,
  //     closestNodes,
  //     size: encoded.length,
  //     signature: event.sig,
  //     proof: event.proof,
  //     peer: from,
  //     qtime,
  //     elapsed,
  //   };
  // }
}

// Query DNS records
async function queryDNS(space: string): Promise<dns.Packet> {
  try {
    // Use the correct API to get DNS records
    const DNS_EVENT_KIND = 871222; // DNS event kind
    const res = await fabric.eventGet(space, DNS_EVENT_KIND, '', { latest: true });
    
    if (!res || !res.event) {
      throw new Error('No records found');
    }
    
    // Decode the DNS packet from the event content
    const zone = dns.decode(res.event.binary_content ? 
      res.event.content : 
      Buffer.from(res.event.content, 'base64'));
      
    return zone;
  } catch (error) {
    console.error('Error querying DNS:', error);
    throw error;
  }
}

// Express route handler
app.get('/', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  
  if (!query) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Beam Publish API</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            h1 { color: #e74c3c; }
            .error { 
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              color: #721c24;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .example {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h1>Beam Publish API</h1>
          <div class="error">
            <p>Query parameter "q" is required</p>
          </div>
          <div class="example">
            <h2>Example Usage:</h2>
            <p>Try querying a space by adding the "q" parameter:</p>
            <p><code>http://127.0.0.1:${port}/?q=@example</code></p>
            <p><a href="http://127.0.0.1:${port}/pub/?q=@zap">http://127.0.0.1:${port}/pub/?q=@zap</a></p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const records = await queryDNS(query);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Publish a zone
async function publishZone(file: string | undefined): Promise<void> {
  // try {

    const opts = {};
    let beam: Beam;
    try {
      let input: string = '';

      if (file && file !== '-') {
        input = fs.readFileSync(file, 'utf8');
      } else {
        if (process.stdin.isTTY) {
          input = '';
        } else {
          // Read from stdin asynchronously.
          for await (const chunk of process.stdin) {
            input += chunk;
          }
        }
      }

      const data = JSON.parse(input);
      beam = await Beam.create(opts);
      await publishEvent(beam, data);
    } catch (e) {
      console.error('Error publishing: ', e instanceof Error ? e.message : e);
    } finally {
      try {
        // @ts-ignore
        await beam.destroy();
      } catch (_) {}
    }

  //   const result = { success: true, message: 'Zone published successfully' };
  //   return result;  
  // } catch (error) {
  //   console.error('Error publishing zone:', error);
  //   throw error;
  // }
}

async function publishEvent(beam : Beam, evt: NostrEvent) {
  if (!isNostrEvent(evt)) throw new Error('must be a signed nostr event')
  await beam.fabric.eventPut(evt, { binary: evt.kind === DNS_EVENT_KIND})
  console.log(`✓ Published ${evt.pubkey} (kind: ${evt.kind})`);
}

function isNostrEvent(data: any) : boolean {
  return data instanceof Object && validateEvent(data)
}

app.get('/pub', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  
  if (!query) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Beam Publish API</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            h1 { color: #e74c3c; }
            .error { 
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              color: #721c24;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .example {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h1>Beam Publish API</h1>
          <div class="error">
            <p>Query parameter "q" is required</p>
          </div>
          <div class="example">
            <h2>Example Usage:</h2>
            <p>Try querying a space by adding the "q" parameter:</p>
            <p><a href="http://127.0.0.1:${port}/pub/?q=@zap">http://127.0.0.1:${port}/pub/?q=@zap</a></p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const result = await publishZone('data/zones/' + query + '.refp');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});


// Start server
async function startServer() {
  try {
    await initFabric();
    app.listen(port, () => {
      console.log(`Server running at http://127.0.0.1:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 