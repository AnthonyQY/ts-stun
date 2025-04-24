import { createSocket, RemoteInfo, Socket } from "node:dgram";

const server: Socket = createSocket("udp4");

const MAGIC_COOKIE: number = 0x2112a442;

enum MessageType {
  Request = 0b0000000000000001,
  Response = 0b0000000100000001,
}

server.on("message", (msg: Buffer, rinfo: RemoteInfo) => {
  // First two bits are zero
  if ((msg.readUint8(0) & 0b11000000) !== 0b00000000) {
    console.log("The first two bits are not zero. (RFC-5389)");
    return;
  }

  // Message should indicate binding request
  if ((msg.readUInt16BE(0) & 0b0011111111111111) !== MessageType.Request) {
    console.log("Message is not a binding request.");
    return;
  }

  // Read message length
  const MESSAGE_LENGTH: number = msg.readUInt16BE(2);

  // Check if magic cookie matches hardcoded value (RFC-5389)
  if (msg.readUInt32BE(4) !== MAGIC_COOKIE) {
    console.log("Message does not contain a matching magic cookie. (RFC-5389)");
    return;
  }

  // Get bytes 9 to 20
  const TRANSACTION_ID: Buffer = msg.subarray(8, 20);

  // Construct the Response Header
  const RESPONSE_HEADER: Buffer = Buffer.alloc(20);
  RESPONSE_HEADER.writeUInt16BE(MessageType.Response, 0);
  RESPONSE_HEADER.writeUInt16BE(12, 2);
  RESPONSE_HEADER.writeUInt32BE(MAGIC_COOKIE, 4);
  TRANSACTION_ID.copy(RESPONSE_HEADER, 8);

  // Construct the Attribute Header
  const ATTRIBUTE_HEADER: Buffer = Buffer.alloc(4);
  ATTRIBUTE_HEADER.writeUInt16BE(0x0020);
  ATTRIBUTE_HEADER.writeUInt16BE(8, 2);

  // Construct the XOR-MAPPED-ADDRESS Attribute Header
  const XOR_MAPPED_ADDRESS: Buffer = Buffer.alloc(8);
  XOR_MAPPED_ADDRESS.writeUInt8(0b00000000, 0);
  XOR_MAPPED_ADDRESS.writeUInt8(0x01, 1);
  XOR_MAPPED_ADDRESS.writeUInt16BE(rinfo.port ^ (MAGIC_COOKIE >>> 16), 2);

  const ipOctets: number[] = rinfo.address.split(".").map((x) => Number(x));
  const ipBuffer: Buffer = Buffer.from(ipOctets);
  const magicCookieBuffer: Buffer = Buffer.alloc(4);
  magicCookieBuffer.writeUInt32BE(MAGIC_COOKIE, 0);

  for (let i = 0; i < 4; i++) {
    XOR_MAPPED_ADDRESS[4 + i] = ipBuffer[i] ^ magicCookieBuffer[i];
  }

  // Construct the full response
  const response: Buffer = Buffer.concat([
    RESPONSE_HEADER,
    ATTRIBUTE_HEADER,
    XOR_MAPPED_ADDRESS,
  ]);

  // Send response
  server.send(
    response,
    0,
    response.length,
    rinfo.port,
    rinfo.address,
    (err) => {
      if (err) {
        console.error("Failed to send STUN response:", err);
      } else {
        console.log(
          `Sent STUN Binding Response to ${rinfo.address}:${rinfo.port}`
        );
      }
    }
  );
});

server.bind(3478, () => {
  console.log("STUN server listening on port 3478");
});
