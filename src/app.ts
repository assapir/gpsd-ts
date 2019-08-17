import { GPSD } from "./gpsd";

const c = new GPSD();
c.
connect().then(async () => {
    const loc = await c.getLocation();
    console.log(loc);
}).catch((err) => {
    console.log(err);
    c.disconnect();
});