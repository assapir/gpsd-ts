import { GPSD } from "./gpsd";

const g = new GPSD();
g.start().then(async () => {
    console.log(g.location);
    console.log(g.location);
    g.stop();
}).catch((err) => {
    console.error(err);
});
