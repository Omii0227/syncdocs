const mongoose = require('mongoose');

const OperationSchema = new mongoose.Schema({
  type: { type: String, enum: ['insert', 'delete'], required: true },
  position: { type: Number, required: true },
  char: { type: String, default: '' },
  userId: { type: String, required: true },
  timestamp: { type: Number, required: true },
}, { _id: false });

const SnapshotSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  operationCount: { type: Number, default: 0 },
  savedAt: { type: Date, default: Date.now },
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  title: { type: String, default: 'Untitled Document' },
  content: { type: String, default: '' },
  operations: [OperationSchema],
  snapshots: [SnapshotSchema],
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
