import { Socket, SocketConnectOpts } from "net";

const DEFAULT_PORT = 2947;
const DEFAULT_HOST = `localhost`;

export interface ConnectOptions {
    port?: number;
    host?: string;
}

export enum Fix {
    "No Fix",
    "2D",
    "3D"
}

export interface Location {
    fix: Fix,
    lat?: string,
    lin?: string
}

export class GPSD {
    private _client: Socket;
    private _isConnected: boolean = false;

    public get isConnected(): boolean {
        return this._isConnected;
    }

    constructor() {
        this._client = new Socket().setEncoding(`ascii`);
        this.connect = this.connect.bind(this);
        this.getLocation = this.getLocation.bind(this);
        this.getData = this.getData.bind(this);
        this.disconnect = this.disconnect.bind(this);
    }

    public connect(connectOptions?: ConnectOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this._isConnected) {
                return resolve();
            }

            let options: SocketConnectOpts = {
                port: connectOptions && connectOptions.port ? connectOptions.port : DEFAULT_PORT,
                host: connectOptions && connectOptions.host ? connectOptions.host : DEFAULT_HOST,
            }
            try {
                this._client.connect(options, () => {
                    this._isConnected = true;
                    return resolve;
                });
            } catch (error) {
               return reject(error); 
            }
        });
    }

    public async getLocation(): Promise<Location> {
        this._client.write(`?WATCH={"enable":true,"json":true}`, (err) => {
            if (err) {
                throw err;
            }
        });

        const raw = await this.getData();
        const dataArray = raw.split(`\n`).filter(v => v); // remove empty elements
        const filtered: object[] = dataArray
            .map(value => JSON.parse(value))
            .reduce((accumulator, obj) => {
                if (obj[`class`] === "TPV") {
                    accumulator.push(obj);
                }
                return accumulator;
            }, []);

        if (!filtered || filtered.length === 0) {
            throw new Error(`no TPV found!`);
        }

        return (filtered as any);
    }

    public disconnect(): void {
        this._isConnected = false;
        this._client.destroy();
    }

    private async getData(): Promise<string> {
        return new Promise((resolve, reject) => {
            this._client.once(`data`, (raw: string) => {
                return resolve(raw);
            });

            this._client.once(`error`, (err: Error) => {
                return reject(err);
            });
        });
    }
}