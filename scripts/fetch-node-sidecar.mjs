#!/usr/bin/env node
/**
 * Descarga el runtime de Node.js oficial para la plataforma actual y lo
 * coloca en src-tauri/binaries/ con el nombre que Tauri espera para un
 * "sidecar" (binario externo empaquetado en el instalador).
 *
 * Sin esto, la app de escritorio compilada dependería de que el sistema del
 * usuario final tenga Node.js instalado (backend/dist/server.js se lanza
 * con `Command::new("node")`) — algo que no se puede asumir en una
 * instalación limpia de Windows/macOS/Linux.
 *
 * Se ejecuta como paso previo a `tauri build` (ver package.json y el
 * workflow de CI). Es idempotente: si el binario ya existe, no vuelve a
 * descargarlo salvo que se pase --force.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Versión LTS de Node.js embebida como runtime de producción de la app.
// Independiente de la versión de Node usada para compilar (esa la fija CI).
const NODE_VERSION = "22.11.0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const binariesDir = path.join(repoRoot, "src-tauri", "binaries");

function targetTriple() {
  const out = execFileSync("rustc", ["-vV"], { encoding: "utf8" });
  const match = out.match(/^host:\s*(\S+)/m);
  if (!match) {
    throw new Error("No se pudo determinar el target triple con `rustc -vV`. ¿Está Rust instalado?");
  }
  return match[1];
}

// Mapea el target triple de Rust al nombre de plataforma-arquitectura que usa
// nodejs.org para sus binarios oficiales, y al formato de archivo.
const TRIPLE_TO_NODE = {
  "x86_64-unknown-linux-gnu": { nodePlatform: "linux-x64", ext: "tar.xz" },
  "aarch64-unknown-linux-gnu": { nodePlatform: "linux-arm64", ext: "tar.xz" },
  "x86_64-pc-windows-msvc": { nodePlatform: "win-x64", ext: "zip" },
  "aarch64-pc-windows-msvc": { nodePlatform: "win-arm64", ext: "zip" },
  "x86_64-apple-darwin": { nodePlatform: "darwin-x64", ext: "tar.gz" },
  "aarch64-apple-darwin": { nodePlatform: "darwin-arm64", ext: "tar.gz" },
};

async function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));
  return hash.digest("hex");
}

async function download(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Descarga falló (${res.status} ${res.statusText}): ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const fs = await import("node:fs/promises");
  await fs.writeFile(destPath, buf);
}

async function main() {
  const force = process.argv.includes("--force");
  const triple = targetTriple();
  const mapping = TRIPLE_TO_NODE[triple];
  if (!mapping) {
    throw new Error(
      `Target triple "${triple}" no soportado por este script. Añádelo a TRIPLE_TO_NODE en scripts/fetch-node-sidecar.mjs.`
    );
  }

  const isWindows = mapping.nodePlatform.startsWith("win-");
  const destName = `node-${triple}${isWindows ? ".exe" : ""}`;
  const destPath = path.join(binariesDir, destName);

  if (existsSync(destPath) && !force) {
    console.log(`✓ Sidecar de Node.js ya presente: src-tauri/binaries/${destName}`);
    return;
  }

  const archiveBase = `node-v${NODE_VERSION}-${mapping.nodePlatform}`;
  const archiveName = `${archiveBase}.${mapping.ext}`;
  const baseUrl = `https://nodejs.org/dist/v${NODE_VERSION}`;

  const tmpDir = mkdtempSync(path.join(tmpdir(), "formula-care-node-sidecar-"));
  const archivePath = path.join(tmpDir, archiveName);

  try {
    console.log(`Descargando ${archiveName} (Node.js ${NODE_VERSION} para ${mapping.nodePlatform})...`);
    await download(`${baseUrl}/${archiveName}`, archivePath);

    console.log("Verificando checksum SHA256...");
    const shasumsPath = path.join(tmpDir, "SHASUMS256.txt");
    await download(`${baseUrl}/SHASUMS256.txt`, shasumsPath);
    const shasums = readFileSync(shasumsPath, "utf8");
    const expectedLine = shasums.split("\n").find((line) => line.trim().endsWith(archiveName));
    if (!expectedLine) {
      throw new Error(`No se encontró el checksum de ${archiveName} en SHASUMS256.txt`);
    }
    const expectedHash = expectedLine.trim().split(/\s+/)[0];
    const actualHash = await sha256File(archivePath);
    if (expectedHash !== actualHash) {
      throw new Error(
        `Checksum inválido para ${archiveName}: esperado ${expectedHash}, obtenido ${actualHash}`
      );
    }

    console.log("Extrayendo...");
    execFileSync("tar", ["-xf", archivePath, "-C", tmpDir]);

    const extractedBinary = isWindows
      ? path.join(tmpDir, archiveBase, "node.exe")
      : path.join(tmpDir, archiveBase, "bin", "node");

    mkdirSync(binariesDir, { recursive: true });
    renameSync(extractedBinary, destPath);
    if (!isWindows) {
      chmodSync(destPath, 0o755);
    }

    console.log(`✓ Sidecar de Node.js listo: src-tauri/binaries/${destName}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
