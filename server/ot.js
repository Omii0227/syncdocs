/**
 * Operational Transformation logic for SyncDocs
 * Transforms op1 against op2 (op2 was already applied to the document)
 */
function transformOp(op1, op2) {
  const transformed = { ...op1 };

  if (op2.type === 'insert') {
    const insertLength = (op2.char || '').length;
    
    if (op1.type === 'insert') {
      // Both inserts
      if (op1.position > op2.position) {
        // op1 is after op2 → shift right by insert length
        transformed.position = op1.position + insertLength;
      } else if (op1.position === op2.position) {
        // Same position — use userId to break tie consistently
        if (op1.userId > op2.userId) {
          transformed.position = op1.position + insertLength;
        }
        // else: op1 stays at same position (goes before op2)
      }
    } else if (op1.type === 'delete') {
      // op1 delete, op2 insert
      if (op1.position >= op2.position) {
        transformed.position = op1.position + insertLength;
      }
    }
  } else if (op2.type === 'delete') {
    if (op1.type === 'insert') {
      // op1 insert, op2 delete
      if (op1.position > op2.position) {
        transformed.position = op1.position - 1;
      }
    } else if (op1.type === 'delete') {
      // Both deletes
      if (op1.position > op2.position) {
        transformed.position = op1.position - 1;
      } else if (op1.position === op2.position) {
        // Same position deleted — mark as no-op
        transformed.noOp = true;
        transformed.type = 'noop';
      }
    }
  }

  return transformed;
}

/**
 * Apply a single operation to a string, returns new string
 */
function applyOp(content, op) {
  if (op.noOp || op.type === 'noop') return content;
  
  const pos = Math.max(0, Math.min(op.position, content.length));
  
  if (op.type === 'insert') {
    const charToInsert = op.char || '';
    return content.slice(0, pos) + charToInsert + content.slice(pos);
  } else if (op.type === 'delete') {
    if (pos >= content.length) return content;
    return content.slice(0, pos) + content.slice(pos + 1);
  }
  
  return content;
}

/**
 * Transform incoming op against all ops in history that were applied concurrently
 */
function transformAgainstHistory(incomingOp, history) {
  let op = { ...incomingOp };
  for (const histOp of history) {
    op = transformOp(op, histOp);
    if (op.noOp || op.type === 'noop') break;
  }
  return op;
}

module.exports = { transformOp, applyOp, transformAgainstHistory };
