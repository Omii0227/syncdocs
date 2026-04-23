export const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#F7DC6F',
  '#82E0AA',
]

export function getColor(index) {
  return USER_COLORS[index % USER_COLORS.length]
}

export function generateUserId() {
  return Math.random().toString(36).slice(2, 10)
}
