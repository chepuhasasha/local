// Запуск:
//   node get_addresses.js --month 202512
//   node get_addresses.js 202512
//
// Если месяц не передать — возьмёт текущий YYYYMM из системной даты.
//
// Выход: ./out/chunk_000001.json ...
// Кэш:  ./work (zip + распакованное)

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const unzipper = require("unzipper");
const { TextDecoder } = require("util");

// --------------------
// defaults
// --------------------
const DEFAULTS = {
  workDir: "./work",
  outDir: "./out",
  chunkSize: 50000,
  reuse: true,
  progressEveryMs: 2000,
  progressEveryLines: 500000,
  downloadLogEveryMs: 1500,
};

// --------------------
// formatting toggles (output strings)
// --------------------
const FORMAT = {
  includeMountainPrefixKo: true,
  includeUndergroundPrefixKo: true,
  includeMountainWordEn: true,
  includeUndergroundWordEn: false,
};

// unicode escapes (код без национального алфавита)
const KO_MOUNTAIN_PREFIX = "\uC0B0";
const KO_UNDERGROUND_PREFIX = "\uC9C0\uD558";

// suffix from your URL (encoded)
const FILE_NAME_SUFFIX_ENCODED =
  "%EA%B1%B4%EB%AC%BCDB_%EC%A0%84%EC%B2%B4%EB%B6%84.zip";

// --------------------
// tiny utils
// --------------------
function norm(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function pad6(n) {
  return String(n).padStart(6, "0");
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function joinParts(parts) {
  return parts.filter(Boolean).join(" ").trim();
}
function makeNumber(main, sub) {
  if (!main) return null;
  if (sub && sub !== "0") return `${main}-${sub}`;
  return `${main}`;
}
function nowMs() {
  return Date.now();
}
function humanBytes(n) {
  if (!Number.isFinite(n)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0,
    x = n;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  const v = i === 0 ? `${Math.round(x)}` : `${x.toFixed(1)}`;
  return `${v} ${units[i]}`;
}
function pct(bytesRead, total) {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, (bytesRead / total) * 100));
}
function getHttpLib(urlObj) {
  return urlObj.protocol === "https:" ? https : http;
}
function safeSize(p) {
  try {
    return fs.statSync(p).size;
  } catch (_) {
    return 0;
  }
}

function getMonthFromArgs() {
  // node script.js --month 202512
  const i = process.argv.indexOf("--month");
  if (i !== -1 && process.argv[i + 1] && /^\d{6}$/.test(process.argv[i + 1])) {
    return process.argv[i + 1];
  }

  // node script.js 202512
  if (process.argv[2] && /^\d{6}$/.test(process.argv[2])) {
    return process.argv[2];
  }

  // fallback: текущий месяц
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

// --------------------
// URL builder
// --------------------
function buildZipUrl(monthYYYYMM) {
  const year = monthYYYYMM.slice(0, 4);
  const params = new URLSearchParams({
    regYmd: year,
    reqType: "ALLRDNM",
    ctprvnCd: "00",
    stdde: monthYYYYMM,
    fileName: `${monthYYYYMM}_${FILE_NAME_SUFFIX_ENCODED}`,
    realFileName: `${monthYYYYMM}ALLRDNM00.zip`,
    intFileNo: "0",
    intNum: "0",
    _Html5: "true",
    _StartOffset: "0",
    _EndOffset: "149056343",
  });
  return `https://business.juso.go.kr/api/jst/download?${params.toString()}`;
}

// --------------------
// download with progress logs (HEAD + GET)
// --------------------
function headContentLength(url, maxRedirects = 5) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const lib = getHttpLib(urlObj);

    const req = lib.request(
      {
        method: "HEAD",
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: { "User-Agent": "node", Accept: "*/*" },
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          maxRedirects > 0
        ) {
          res.resume();
          const next = new URL(res.headers.location, urlObj).toString();
          return resolve(headContentLength(next, maxRedirects - 1));
        }
        const len = Number(res.headers["content-length"] || 0);
        res.resume();
        resolve(Number.isFinite(len) ? len : 0);
      },
    );

    req.on("error", () => resolve(0));
    req.end();
  });
}

async function downloadFileWithLogs(url, destPath, logEveryMs) {
  const totalFromHead = await headContentLength(url);

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    ensureDir(path.dirname(destPath));
    const out = fs.createWriteStream(destPath);

    let downloaded = 0;
    let total = totalFromHead || 0;
    let lastLogAt = nowMs() - logEveryMs; // log immediately

    function logProgress() {
      const hasTotal = total && total > 0;
      const p = hasTotal ? pct(downloaded, total).toFixed(1) : "?";
      const tStr = hasTotal ? humanBytes(total) : "?";
      process.stdout.write(
        `[download] ${p}% (${humanBytes(downloaded)}/${tStr})\n`,
      );
    }

    const req = getHttpLib(urlObj).get(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: { "User-Agent": "node", Accept: "*/*" },
      },
      (res) => {
        // redirects
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          out.close();
          try {
            fs.unlinkSync(destPath);
          } catch (_) {}
          const next = new URL(res.headers.location, urlObj).toString();
          return resolve(downloadFileWithLogs(next, destPath, logEveryMs));
        }

        if (res.statusCode !== 200) {
          res.resume();
          out.close();
          try {
            fs.unlinkSync(destPath);
          } catch (_) {}
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        const cl = Number(res.headers["content-length"] || 0);
        if (cl > 0) total = cl;

        process.stdout.write(
          `[download] start ${path.basename(destPath)} total=${total > 0 ? humanBytes(total) : "?"}\n`,
        );
        logProgress();

        res.on("data", (chunk) => {
          downloaded += chunk.length;
          const t = nowMs();
          if (t - lastLogAt >= logEveryMs) {
            lastLogAt = t;
            logProgress();
          }
        });

        res.pipe(out);

        out.on("finish", () => {
          out.close(() => {
            logProgress();
            process.stdout.write(
              `[download] done ${path.basename(destPath)}\n`,
            );
            resolve();
          });
        });

        out.on("error", (e) => reject(e));
      },
    );

    req.on("error", (e) => reject(e));
  });
}

// --------------------
// unzip via npm (unzipper)
// --------------------
function unzip(zipPath, destDir) {
  ensureDir(destDir);
  process.stdout.write(`[unpack] start ${path.basename(zipPath)}\n`);

  return new Promise((resolve, reject) => {
    const stream = fs
      .createReadStream(zipPath)
      .on("error", reject)
      .pipe(unzipper.Extract({ path: destDir }));

    stream.on("close", () => {
      process.stdout.write(`[unpack] done ${path.basename(zipPath)}\n`);
      resolve();
    });
    stream.on("error", reject);
  });
}

// --------------------
// decoder + streaming lines with progress callback
// --------------------
function createDecoder() {
  for (const enc of ["windows-949", "cp949", "euc-kr", "utf-8"]) {
    try {
      const dec = new TextDecoder(enc);
      dec.decode(new Uint8Array([0x41]));
      return dec;
    } catch (_) {}
  }
  return null;
}

/**
 * onProgress({ filePath, fileSize, bytesRead, linesRead, isFinal })
 */
async function forEachLine(filePath, decoder, onLine, onProgress, opts = {}) {
  const fileSize = (() => {
    try {
      return fs.statSync(filePath).size;
    } catch (_) {
      return 0;
    }
  })();

  const logEveryMs = opts.logEveryMs ?? 2000;
  const logEveryLines = opts.logEveryLines ?? 500000;

  const stream = fs.createReadStream(filePath);
  let remainder = "";
  let bytesRead = 0;
  let linesRead = 0;
  let lastReportAt = nowMs();

  const report = (isFinal) => {
    if (!onProgress) return;
    onProgress({
      filePath,
      fileSize,
      bytesRead,
      linesRead,
      isFinal: !!isFinal,
    });
  };

  for await (const chunk of stream) {
    bytesRead += chunk.length;

    const text = decoder.decode(chunk, { stream: true });
    const data = remainder + text;
    const parts = data.split("\n");
    remainder = parts.pop() || "";

    for (let line of parts) {
      line = line.replace(/\r$/, "");
      if (!line) continue;
      if (line.charCodeAt(0) === 0xfeff) line = line.slice(1);
      linesRead++;
      await onLine(line);

      if (logEveryLines > 0 && linesRead % logEveryLines === 0) {
        report(false);
        lastReportAt = nowMs();
      }
    }

    if (logEveryMs > 0 && nowMs() - lastReportAt >= logEveryMs) {
      report(false);
      lastReportAt = nowMs();
    }
  }

  const tail = decoder.decode(new Uint8Array(), { stream: false });
  const last = (remainder + tail).replace(/\r$/, "");
  if (last) {
    linesRead++;
    await onLine(last);
  }

  report(true);
}

// --------------------
// find files inside unpacked dir
// --------------------
function listFilesRecursive(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) out.push(p);
    }
  }
  return out;
}

function pickRoadFile(allFiles) {
  const cands = allFiles
    .filter(
      (p) => /road_code_total/i.test(path.basename(p)) && /\.txt$/i.test(p),
    )
    .map((p) => ({ p, size: safeSize(p) }))
    .sort((a, b) => b.size - a.size);
  return cands.length ? cands[0].p : null;
}

function pickBuildFiles(allFiles) {
  return allFiles
    .filter((p) => {
      const bn = path.basename(p);
      return bn.startsWith("build_") && /\.txt$/i.test(bn);
    })
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

// --------------------
// road dictionary index
// --------------------
function indexRoadRow(cols) {
  while (cols.length < 20) cols.push("");

  const districtCode = norm(cols[0]);
  const roadNo = norm(cols[1]);
  const localAreaSerial = norm(cols[4]);

  const roadCode = districtCode && roadNo ? `${districtCode}${roadNo}` : null;
  if (!roadCode || !localAreaSerial) return null;

  return {
    key: `${roadCode}|${localAreaSerial}`,
    value: {
      ko: {
        region1: norm(cols[5]),
        region2: norm(cols[6]),
        area: norm(cols[9]),
        roadName: norm(cols[2]),
      },
      en: {
        region1: norm(cols[15]),
        region2: norm(cols[16]),
        area: norm(cols[17]),
        roadName: norm(cols[3]),
      },
    },
  };
}

// --------------------
// build row -> document
// --------------------
function buildToDoc(cols, roadIndex) {
  while (cols.length < 31) cols.push("");

  const id = norm(cols[15]);
  const roadCode = norm(cols[8]);
  const localAreaSerial = norm(cols[16]);
  const buildingMainNo = norm(cols[11]);

  if (!id || !roadCode || !localAreaSerial || !buildingMainNo) return null;

  const legalAreaCode = norm(cols[0]);

  const parcelKo = {
    region1: norm(cols[1]),
    region2: norm(cols[2]),
    region3: norm(cols[3]),
    region4: norm(cols[4]) || null,
  };

  const isMountainLot = norm(cols[5]) === "1";
  const mainNo = norm(cols[6]);
  const subNo = norm(cols[7]);
  const parcelNoRaw = makeNumber(mainNo, subNo);

  const isUnderground = norm(cols[10]) === "1";
  const buildingSubNo = norm(cols[12]);
  const buildingNoRaw = makeNumber(buildingMainNo, buildingSubNo);

  const postalCode = norm(cols[27]) || norm(cols[19]) || null;

  const buildingNameKo =
    norm(cols[25]) || norm(cols[13]) || norm(cols[14]) || null;

  const dict = roadIndex.get(`${roadCode}|${localAreaSerial}`) || null;

  const roadKo = {
    region1: dict?.ko?.region1 || parcelKo.region1 || null,
    region2: dict?.ko?.region2 || parcelKo.region2 || null,
    area: dict?.ko?.area || parcelKo.region3 || null,
    roadName: norm(cols[9]) || dict?.ko?.roadName || null,
  };

  const roadEn = {
    region1: dict?.en?.region1 || null,
    region2: dict?.en?.region2 || null,
    area: dict?.en?.area || null,
    roadName: dict?.en?.roadName || null,
  };

  const buildingNoKo =
    isUnderground && FORMAT.includeUndergroundPrefixKo && buildingNoRaw
      ? `${KO_UNDERGROUND_PREFIX}${buildingNoRaw}`
      : buildingNoRaw;

  const buildingNoEn =
    isUnderground && FORMAT.includeUndergroundWordEn && buildingNoRaw
      ? `Underground ${buildingNoRaw}`
      : buildingNoRaw;

  const parcelNoKo =
    isMountainLot && FORMAT.includeMountainPrefixKo && parcelNoRaw
      ? `${KO_MOUNTAIN_PREFIX}${parcelNoRaw}`
      : parcelNoRaw;

  const parcelNoEn =
    isMountainLot && FORMAT.includeMountainWordEn && parcelNoRaw
      ? `Mountain ${parcelNoRaw}`
      : parcelNoRaw;

  const roadFullKo =
    joinParts([
      roadKo.region1,
      roadKo.region2,
      roadKo.area,
      roadKo.roadName,
      buildingNoKo,
    ]) || null;

  const roadFullEn =
    roadEn.region1 && roadEn.region2 && roadEn.roadName && buildingNoEn
      ? joinParts([
          roadEn.region1,
          roadEn.region2,
          roadEn.area,
          roadEn.roadName,
          buildingNoEn,
        ]) || null
      : null;

  const parcelFullKo =
    joinParts([
      parcelKo.region1,
      parcelKo.region2,
      parcelKo.region3,
      parcelKo.region4,
      parcelNoKo,
    ]) || null;

  const parcelFullEn =
    roadEn.region1 && roadEn.region2 && roadEn.area && parcelNoEn
      ? joinParts([roadEn.region1, roadEn.region2, roadEn.area, parcelNoEn]) ||
        null
      : null;

  const displayKo = roadFullKo || parcelFullKo || null;
  const displayEn = roadFullEn || parcelFullEn || null;

  const searchKo = joinParts([
    roadFullKo,
    parcelFullKo,
    postalCode,
    buildingNameKo,
  ]).toLowerCase();
  const searchEn = joinParts([
    roadFullEn,
    parcelFullEn,
    postalCode,
  ]).toLowerCase();

  return {
    id,
    x: null,
    y: null,
    display: { ko: displayKo, en: displayEn },
    road: {
      ko: {
        region1: roadKo.region1,
        region2: roadKo.region2,
        region3: roadKo.area,
        roadName: roadKo.roadName,
        buildingNo: buildingNoKo,
        isUnderground,
        full: roadFullKo,
      },
      en: {
        region1: roadEn.region1,
        region2: roadEn.region2,
        region3: roadEn.area,
        roadName: roadEn.roadName,
        buildingNo: buildingNoEn,
        isUnderground,
        full: roadFullEn,
      },
      codes: { roadCode, localAreaSerial, postalCode },
      building: { nameKo: buildingNameKo },
    },
    parcel: {
      ko: {
        region1: parcelKo.region1,
        region2: parcelKo.region2,
        region3: parcelKo.region3,
        region4: parcelKo.region4,
        isMountainLot,
        mainNo,
        subNo,
        parcelNo: parcelNoKo,
        full: parcelFullKo,
      },
      en: {
        region1: roadEn.region1,
        region2: roadEn.region2,
        region3: roadEn.area,
        region4: null,
        isMountainLot,
        mainNo,
        subNo,
        parcelNo: parcelNoEn,
        full: parcelFullEn,
      },
      codes: { legalAreaCode },
    },
    search: { ko: searchKo || null, en: searchEn || null },
  };
}

// --------------------
// progress printer
// --------------------
function makeBuildProgressPrinter(ctx) {
  let lastKey = "";
  return (st) => {
    const p = pct(st.bytesRead, st.fileSize).toFixed(1);
    const state = ctx.getState();

    const line =
      `${ctx.label}: ${p}% (${humanBytes(st.bytesRead)}/${humanBytes(st.fileSize)}) ` +
      `lines=${st.linesRead} exported=${state.exported} chunk=${state.chunkIndex} fileExported=${state.fileExported}`;

    const key = `${p}|${st.linesRead}|${state.exported}|${state.chunkIndex}|${state.fileExported}`;
    if (key === lastKey && !st.isFinal) return;
    lastKey = key;

    process.stdout.write(line + "\n");
  };
}

// --------------------
// main
// --------------------
async function main() {
  const month = getMonthFromArgs();
  const workDir = DEFAULTS.workDir;
  const outDir = DEFAULTS.outDir;

  ensureDir(workDir);
  ensureDir(outDir);

  const decoder = createDecoder();
  if (!decoder) {
    process.stderr.write("Decoder not available (convert inputs to UTF-8).\n");
    process.exit(2);
  }

  const url = buildZipUrl(month);
  const zipDir = path.join(workDir, "zips");
  const zipPath = path.join(zipDir, `${month}.zip`);
  const unpackDir = path.join(workDir, "unpacked", month);

  ensureDir(zipDir);

  // download (with progress)
  if (!DEFAULTS.reuse || !fs.existsSync(zipPath) || safeSize(zipPath) === 0) {
    await downloadFileWithLogs(url, zipPath, DEFAULTS.downloadLogEveryMs);
  } else {
    process.stdout.write(
      `[download] reuse ${path.basename(zipPath)} size=${humanBytes(safeSize(zipPath))}\n`,
    );
  }

  // unzip (npm)
  if (
    !DEFAULTS.reuse ||
    !fs.existsSync(unpackDir) ||
    fs.readdirSync(unpackDir).length === 0
  ) {
    await unzip(zipPath, unpackDir);
  } else {
    process.stdout.write(`[unpack] reuse ${month}\n`);
  }

  // find files
  const allFiles = listFilesRecursive(unpackDir);
  const roadFile = pickRoadFile(allFiles);
  const buildFiles = pickBuildFiles(allFiles);

  if (!roadFile) {
    process.stderr.write("road_code_total*.txt not found in archive.\n");
    process.exit(3);
  }
  if (buildFiles.length === 0) {
    process.stderr.write("build_* files not found in archive.\n");
    process.exit(4);
  }

  // index roads
  const roadIndex = new Map();
  await forEachLine(
    roadFile,
    decoder,
    async (line) => {
      const cols = line.split("|");
      if (cols.length < 5) return;
      const idx = indexRoadRow(cols);
      if (!idx) return;
      if (!roadIndex.has(idx.key)) roadIndex.set(idx.key, idx.value);
    },
    null,
    {
      logEveryMs: DEFAULTS.progressEveryMs,
      logEveryLines: DEFAULTS.progressEveryLines,
    },
  );

  // export
  let buf = [];
  let chunkIndex = 1;
  let exported = 0;

  function flush(isEnd) {
    if (buf.length === 0) return;

    const payload = {
      meta: {
        chunk: chunkIndex,
        chunk_size: DEFAULTS.chunkSize,
        count: buf.length,
        is_end: !!isEnd,
      },
      documents: buf,
    };

    const file = path.join(outDir, `chunk_${pad6(chunkIndex)}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");

    process.stdout.write(
      `[write] ${path.basename(file)} docs=${payload.meta.count} total=${exported} end=${payload.meta.is_end}\n`,
    );

    buf = [];
    chunkIndex += 1;
  }

  for (let i = 0; i < buildFiles.length; i++) {
    const buildFile = buildFiles[i];
    const base = path.basename(buildFile);

    let fileExported = 0;

    const printer = makeBuildProgressPrinter({
      label: `[build ${i + 1}/${buildFiles.length} ${base}]`,
      getState: () => ({ exported, chunkIndex, fileExported }),
    });

    await forEachLine(
      buildFile,
      decoder,
      async (line) => {
        const cols = line.split("|");
        if (cols.length < 16) return;

        const doc = buildToDoc(cols, roadIndex);
        if (!doc) return;

        buf.push(doc);
        exported++;
        fileExported++;

        if (buf.length >= DEFAULTS.chunkSize) flush(false);
      },
      printer,
      {
        logEveryMs: DEFAULTS.progressEveryMs,
        logEveryLines: DEFAULTS.progressEveryLines,
      },
    );
  }

  flush(true);
}

main().catch((e) => {
  process.stderr.write(String(e?.message || e) + "\n");
  process.exit(1);
});
