import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";

const template = new URL("../.env.example", import.meta.url);
const destination = new URL("../.env.local", import.meta.url);

try {
  await copyFile(template, destination, constants.COPYFILE_EXCL);
  console.log("Created .env.local from the shared .env.example template.");
  console.log("Set the shared private APPLICANT_SESSION_SECRET (see docs/APPLICANT_PRIVACY.md) and any required provider values, then restart npm run dev.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(".env.local already exists; existing values were preserved.");
  console.log("Compare it with .env.example when the shared project configuration changes.");
}
