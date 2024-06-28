import { ClientFunctions, Connection, ConnectionManager, ServerFunctions } from "../../shared/connection.js";
import {
  Service,
  ServiceGetDataCallback,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared/service.js";
import { io, Manager, Socket } from "socket.io-client";

export class ClientConnection extends Connection<Socket, ClientConnection, ClientFunctions, ServerFunctions> {
  static #manager = new Manager('http://25.8.34.85:8082')
  static #connection: ClientConnection | null = null

  static async getInstance(): Promise<ClientConnection> {
    if (this.#connection != null) {
      return this.#connection
    }
    return new Promise((resolve, reject) => {
      this.#manager.socket('')
    })
  }

  public constructor(socket: Socket) {
    super(socket, {

    })
  }
}

// export interface ClientData {}

// export type ClientOptions = [hostname: string, port: number];

// export class Client extends Service<ClientData, ClientOptions> {
//   static #instance: Client | null = null;
//   public static async getInstance(
//     hostname: string,
//     port: number
//   ): Promise<Client> {
//     if (this.#instance != null) {
//       return this.#instance;
//     }

//     const client = new this();
//     await client.start(hostname, port);

//     return (this.#instance = client);
//   }

//   public constructor() {
//     let getData: ServiceGetDataCallback<ClientData> = null as never;

//     super((func) => (getData = func));
//     this.#getData = getData;
//   }

//   readonly #getData: ServiceGetDataCallback<ClientData>;
//   get #data() {
//     return this.#getData();
//   }

//   async run(
//     setData: ServiceSetDataCallback<ClientData>,
//     onReady: ServiceReadyCallback,
//     ...[hostname, port]: ClientOptions
//   ): Promise<void> {
//     const manager = new Manager(`http://${hostname}:${port}/`);
//     const socket = manager.socket("/");

//     await new Promise<void>(onReady);
//     socket.disconnect();
//   }
// }
