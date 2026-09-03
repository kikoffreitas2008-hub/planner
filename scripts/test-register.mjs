// Registers the resolution hooks used by `npm test`.
import { register } from "node:module";

register("./test-hooks.mjs", import.meta.url);
