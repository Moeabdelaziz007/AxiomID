"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOT_AGENT_ID = exports.deriveUserRootKey = exports.verifySignature = exports.signPayload = exports.deriveKeypair = void 0;
var keypair_1 = require("./keypair");
Object.defineProperty(exports, "deriveKeypair", { enumerable: true, get: function () { return keypair_1.deriveKeypair; } });
Object.defineProperty(exports, "signPayload", { enumerable: true, get: function () { return keypair_1.signPayload; } });
Object.defineProperty(exports, "verifySignature", { enumerable: true, get: function () { return keypair_1.verifySignature; } });
Object.defineProperty(exports, "deriveUserRootKey", { enumerable: true, get: function () { return keypair_1.deriveUserRootKey; } });
Object.defineProperty(exports, "ROOT_AGENT_ID", { enumerable: true, get: function () { return keypair_1.ROOT_AGENT_ID; } });
