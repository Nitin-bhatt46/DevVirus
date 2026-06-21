const ANSI_CODES = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
  },
  bg: {
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m'
  }
};

const colorize = (code, text) => `${code}${text}${ANSI_CODES.reset}`;

const colors = {
  reset: ANSI_CODES.reset,
  bold: (txt) => colorize(ANSI_CODES.bold, txt),
  dim: (txt) => colorize(ANSI_CODES.dim, txt),
  underline: (txt) => colorize(ANSI_CODES.underline, txt),
  red: (txt) => colorize(ANSI_CODES.fg.red, txt),
  green: (txt) => colorize(ANSI_CODES.fg.green, txt),
  yellow: (txt) => colorize(ANSI_CODES.fg.yellow, txt),
  blue: (txt) => colorize(ANSI_CODES.fg.blue, txt),
  magenta: (txt) => colorize(ANSI_CODES.fg.magenta, txt),
  cyan: (txt) => colorize(ANSI_CODES.fg.cyan, txt),
  white: (txt) => colorize(ANSI_CODES.fg.white, txt),
  gray: (txt) => colorize(ANSI_CODES.fg.gray, txt),
  bgRed: (txt) => colorize(ANSI_CODES.bg.red, txt),
  bgGreen: (txt) => colorize(ANSI_CODES.bg.green, txt),
  bgYellow: (txt) => colorize(ANSI_CODES.bg.yellow, txt),
  bgBlue: (txt) => colorize(ANSI_CODES.bg.blue, txt)
};

const stripAnsi = (str) => {
  if (typeof str !== 'string') return String(str);
  return str.replace(/\x1b\[[0-9;]*m/g, '');
};

const info = (msg) => {
  console.log(`${colors.cyan('[INFO]')} ${msg}`);
};

const success = (msg) => {
  console.log(`${colors.green('[SUCCESS]')} ${msg}`);
};

const warn = (msg) => {
  console.log(`${colors.yellow('[WARN]')} ${msg}`);
};

const error = (msg) => {
  console.error(`${colors.red('[ERROR]')} ${msg}`);
};

const critical = (msg) => {
  console.error(`${colors.bold(colors.bgRed(' CRITICAL '))} ${colors.red(msg)}`);
};

const banner = () => {
  const logo = `
  ██████╗ ███████╗██╗   ██╗██╗   ██╗██╗██████╗ ██╗   ██╗███████╗
  ██╔══██╗██╔════╝██║   ██║██║   ██║██║██╔══██╗██║   ██║██╔════╝
  ██║  ██║█████╗  ██║   ██║██║   ██║██║██████╔╝██║   ██║███████╗
  ██║  ██║██╔══╝  ╚██╗ ██╔╝╚██╗ ██╔╝██║██╔══██╗██║   ██║╚════██║
  ██████╔╝███████╗ ╚████╔╝  ╚████╔╝ ██║██║  ██║╚██████╔╝███████║
  ╚══════╝ ╚══════╝  ╚═══╝    ╚═══╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  `;
  console.log(colors.cyan(logo));
  console.log(colors.dim(`  DevVirus Security Scanner | CLI Edition v1.0.0`));
  console.log(colors.dim(`  ----------------------------------------------`));
  console.log();
};

const table = (headers, rows) => {
  if (!headers || headers.length === 0) return;

  // Initialize column widths based on headers
  const colWidths = headers.map(h => stripAnsi(h).length);

  // Compute maximum widths from rows
  for (const row of rows) {
    for (let i = 0; i < headers.length; i++) {
      const cellVal = row[i] !== undefined ? String(row[i]) : '';
      const cellLen = stripAnsi(cellVal).length;
      if (cellLen > colWidths[i]) {
        colWidths[i] = cellLen;
      }
    }
  }

  // Helper to draw horizontal lines
  const drawLine = (left, mid, right, line) => {
    return left + colWidths.map(w => line.repeat(w + 2)).join(mid) + right;
  };

  const topBorder = drawLine('┌', '┬', '┐', '─');
  const midBorder = drawLine('├', '┼', '┤', '─');
  const botBorder = drawLine('└', '┴', '┘', '─');

  const padCell = (val, width) => {
    const str = val !== undefined ? String(val) : '';
    const visibleLen = stripAnsi(str).length;
    const padding = ' '.repeat(Math.max(0, width - visibleLen));
    return ` ${str}${padding} `;
  };

  // Build the table rows string
  console.log(colors.gray(topBorder));
  
  // Header row
  const headerCells = headers.map((h, i) => padCell(colors.bold(h), colWidths[i])).join(colors.gray('│'));
  console.log(`${colors.gray('│')}${headerCells}${colors.gray('│')}`);
  console.log(colors.gray(midBorder));

  // Data rows
  if (rows.length === 0) {
    const totalWidth = colWidths.reduce((acc, w) => acc + w + 2, 0) + colWidths.length - 1;
    const emptyMsg = 'No records found.';
    const paddingLeft = Math.floor((totalWidth - emptyMsg.length) / 2);
    const paddingRight = totalWidth - emptyMsg.length - paddingLeft;
    console.log(`${colors.gray('│')}${' '.repeat(paddingLeft)}${colors.dim(emptyMsg)}${' '.repeat(paddingRight)}${colors.gray('│')}`);
  } else {
    for (const row of rows) {
      const dataCells = headers.map((_, i) => padCell(row[i], colWidths[i])).join(colors.gray('│'));
      console.log(`${colors.gray('│')}${dataCells}${colors.gray('│')}`);
    }
  }
  
  console.log(colors.gray(botBorder));
};

module.exports = {
  colors,
  info,
  success,
  warn,
  error,
  critical,
  banner,
  table,
  stripAnsi
};
