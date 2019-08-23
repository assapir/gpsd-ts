import { Socket, SocketConnectOpts } from "net";
import { EventEmitter } from "events";

const DEFAULT_PORT = 2947;
const DEFAULT_HOST = `localhost`;

export interface ConnectOptions {
    port?: number;
    host?: string;
}

export enum Fix {
    NoFix,
    TwoD,
    ThreeD
}

export interface Location {
    timeStamp: Date;
    fix: Fix,
    lat?: string,
    lon?: string
}

export class GPSD extends EventEmitter {
    private _client: Socket;
    private _isConnected: boolean = false;
    private _done: boolean = false;
    private _location: Location = { fix: Fix.NoFix, timeStamp: new Date(0) };

    public get isConnected(): boolean {
        return this._isConnected;
    }

    public get location(): Location | undefined {
        if (!this._isConnected) {
            return undefined;
        }
        return this._location;
    }

    constructor() {
        super();
        this._client = new Socket().setEncoding(`ascii`);
        this.start = this.start.bind(this);
        this.stop = this.start.bind(this);
        this.close = this.close.bind(this);
    }

    public async start(connectOptions?: ConnectOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            this._client.on('error', (error: any) => {
                this._isConnected = false;
                return reject(error);
            });

            let options: SocketConnectOpts = {
                port: connectOptions && connectOptions.port ? connectOptions.port : DEFAULT_PORT,
                host: connectOptions && connectOptions.host ? connectOptions.host : DEFAULT_HOST,
            }

            this._client.connect(options, () => {
                this._client.write('?WATCH={"enable":true,"json":true}');
            });

            this._done = false;
            this._client.on('data', (payload: string) => {
                this._isConnected = true;
                if (this._done) {
                    return reject();
                }
                var info = payload.split('\n');
                for (let i = 0; i < info.length; i++) {
                    const value = info[i];
                    let data: any;
                    if (value && !this._done) {
                        try {
                            data = JSON.parse(value);
                        } catch (error) {
                            console.error("bad message format", value, error);
                            continue;
                        }
                        switch (data.class) {
                            case "TPV":
                                this._location.timeStamp = new Date(data.time)
                                if (this._location.lat !== data.lat || this._location !== data.lon) {
                                    this._location.lat = data.lat;
                                    this._location.lon = data.lon;
                                    switch (data.mode) {
                                        case 1:
                                            this._location.fix = Fix.NoFix;
                                            break;
                                        case 2:
                                            break
                                        case 3:
                                            this._location.fix = Fix.ThreeD;
                                            break;
                                        default:
                                            break;
                                    }
                                }
                                this.emit('gotLocation');
                                break;
                            default:
                                continue;
                        }
                    } else if (!value) {
                        continue;
                    } else if (this._done) {
                        break; // don't continue process
                    }
                }
            });

            this.on('gotLocation', () => {
                this.off('gotLocation', () => {});
                return resolve();
            });
        });
    }

    public stop() {
        this.removeAllListeners();
        this._client.removeAllListeners();
        this._done = true;
    }

    public close() {
        this._client.end();
    }
}