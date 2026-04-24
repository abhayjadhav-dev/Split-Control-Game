import os from "node:os";

const port = Number(process.env.PORT || 3000);
const nets = os.networkInterfaces();
const addresses = [];

for (const ifaceName of Object.keys(nets)) {
  for (const net of nets[ifaceName] || []) {
    if (net.family === "IPv4" && !net.internal) {
      addresses.push({ ifaceName, address: net.address });
    }
  }
}

if (addresses.length === 0) {
  console.log("No LAN IPv4 address found. Use http://localhost:" + port);
  process.exit(0);
}

console.log("LAN play URLs:");
for (const item of addresses) {
  console.log(`- ${item.ifaceName}: http://${item.address}:${port}`);
}
