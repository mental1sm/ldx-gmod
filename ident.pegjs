{
  function formatCode(input) {
  const lines = input.split(/\r\n|\r|\n/);
  let depth = 0;
  const formattedLines = [];
  let nextLineIncrease = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      formattedLines.push('');
      continue;
    }

    const increaseDepthKeywords = ['function', 'if', 'for', 'while', 'repeat'];
    const decreaseDepthKeywords = ['end', 'until'];
    const tempDecreaseKeywords = ['else', 'elseif'];

    let currentDepth = depth;

    if (nextLineIncrease) {
      depth += 1;
      currentDepth = depth;
      nextLineIncrease = false;
    }

    let increaseCount = 0;
    let decreaseCount = 0;

    increaseDepthKeywords.forEach(keyword => {
      if (line.startsWith(keyword) || line.includes(` ${keyword} `)) {
        increaseCount++;
      }
    });

    decreaseDepthKeywords.forEach(keyword => {
      if (line.startsWith(keyword) || line.includes(` ${keyword} `)) {
        decreaseCount++;
      }
    });

    // Исправление: Учитываем случай, когда function и end в одной строке
    if (line.includes('function') && line.includes('end')) {
      increaseCount--;
      decreaseCount--;
    }

    if (decreaseCount > 0) {
      currentDepth = Math.max(0, depth - decreaseCount);
    }

    if (tempDecreaseKeywords.some(keyword => line.startsWith(keyword) || line.includes(` ${keyword} `))) {
      currentDepth = Math.max(0, depth - 1);
      if (i + 1 < lines.length) depth += 1;
    }

    const indent = '    '.repeat(currentDepth);
    formattedLines.push(indent + line);

    const netDepthChange = increaseCount - decreaseCount;
    if (netDepthChange !== 0) {
      depth += netDepthChange;
      depth = Math.max(0, depth);
    }

    if (line.includes('function') && !line.startsWith('function') && !line.startsWith('local function') && decreaseCount === 0) {
      nextLineIncrease = true;
    }
  }

  return formattedLines.join('\n');
}

}

Start
  = input:.* { return formatCode(input.join('')); }