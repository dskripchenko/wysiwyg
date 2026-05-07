/**
 * Table command — вставка/редактирование таблиц в editor'е.
 *
 * Поддерживает:
 *   - insertTable(host, rows, cols)         — создать таблицу N×M
 *   - addRowAfter / addRowBefore            — добавить строку
 *   - addColumnAfter / addColumnBefore      — добавить колонку
 *   - removeRow / removeColumn              — удалить
 *   - removeTable                           — удалить всю таблицу
 *
 * Все команды диспатчат InputEvent для form-state синхронизации.
 */
import { rangeWithinHost } from './selection'

function emitInput(host: HTMLElement): void {
  host.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }))
}

export function insertTable(host: HTMLElement, rows: number, cols: number): void {
  const range = rangeWithinHost(host)
  if (!range) return

  const table = document.createElement('table')
  const tbody = document.createElement('tbody')

  // Header row.
  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')
  for (let c = 0; c < cols; c++) {
    const th = document.createElement('th')
    th.appendChild(document.createElement('br'))
    headerRow.appendChild(th)
  }
  thead.appendChild(headerRow)
  table.appendChild(thead)

  // Body rows.
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr')
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td')
      td.appendChild(document.createElement('br'))
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)

  range.deleteContents()
  range.insertNode(table)

  // Empty <p> после таблицы для caret'а.
  const p = document.createElement('p')
  p.appendChild(document.createElement('br'))
  table.after(p)

  // Caret в первый <th>.
  const firstCell = table.querySelector('th')
  if (firstCell) {
    const r = document.createRange()
    r.setStart(firstCell, 0)
    r.collapse(true)
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(r)
    }
  }

  emitInput(host)
}

function findCell(host: HTMLElement): HTMLTableCellElement | null {
  const range = rangeWithinHost(host)
  if (!range) return null
  let n: Node | null = range.startContainer
  while (n && n !== host) {
    if (n instanceof HTMLTableCellElement) return n
    n = n.parentNode
  }
  return null
}

function findRow(host: HTMLElement): HTMLTableRowElement | null {
  const cell = findCell(host)
  return cell ? cell.parentElement as HTMLTableRowElement : null
}

function findTable(host: HTMLElement): HTMLTableElement | null {
  const cell = findCell(host)
  if (!cell) return null
  let n: Node | null = cell
  while (n && n !== host) {
    if (n instanceof HTMLTableElement) return n
    n = n.parentNode
  }
  return null
}

function buildEmptyCell(tagName: 'th' | 'td'): HTMLTableCellElement {
  const cell = document.createElement(tagName)
  cell.appendChild(document.createElement('br'))
  return cell
}

export function addRowAfter(host: HTMLElement): void {
  const row = findRow(host)
  if (!row) return
  const newRow = document.createElement('tr')
  for (let i = 0; i < row.cells.length; i++) {
    newRow.appendChild(buildEmptyCell('td'))
  }
  row.after(newRow)
  emitInput(host)
}

export function addRowBefore(host: HTMLElement): void {
  const row = findRow(host)
  if (!row) return
  const newRow = document.createElement('tr')
  for (let i = 0; i < row.cells.length; i++) {
    newRow.appendChild(buildEmptyCell('td'))
  }
  row.before(newRow)
  emitInput(host)
}

export function addColumnAfter(host: HTMLElement): void {
  const cell = findCell(host)
  const table = findTable(host)
  if (!cell || !table) return
  const colIdx = cell.cellIndex
  for (const row of Array.from(table.rows)) {
    const isHeader = row.parentElement?.tagName.toLowerCase() === 'thead'
    const newCell = buildEmptyCell(isHeader ? 'th' : 'td')
    const target = row.cells[colIdx]
    if (target) target.after(newCell)
    else row.appendChild(newCell)
  }
  emitInput(host)
}

export function addColumnBefore(host: HTMLElement): void {
  const cell = findCell(host)
  const table = findTable(host)
  if (!cell || !table) return
  const colIdx = cell.cellIndex
  for (const row of Array.from(table.rows)) {
    const isHeader = row.parentElement?.tagName.toLowerCase() === 'thead'
    const newCell = buildEmptyCell(isHeader ? 'th' : 'td')
    const target = row.cells[colIdx]
    if (target) target.before(newCell)
    else row.appendChild(newCell)
  }
  emitInput(host)
}

export function removeRow(host: HTMLElement): void {
  const row = findRow(host)
  const table = findTable(host)
  if (!row || !table) return
  // Не удаляем header-row если она единственная.
  const isHeader = row.parentElement?.tagName.toLowerCase() === 'thead'
  if (isHeader && table.rows.length <= 1) return
  row.remove()
  emitInput(host)
}

export function removeColumn(host: HTMLElement): void {
  const cell = findCell(host)
  const table = findTable(host)
  if (!cell || !table) return
  const colIdx = cell.cellIndex
  // Если останется 0 колонок — удаляем всю таблицу.
  const totalCols = table.rows[0]?.cells.length ?? 0
  if (totalCols <= 1) {
    table.remove()
    emitInput(host)
    return
  }
  for (const row of Array.from(table.rows)) {
    const target = row.cells[colIdx]
    if (target) target.remove()
  }
  emitInput(host)
}

export function removeTable(host: HTMLElement): void {
  const table = findTable(host)
  if (!table) return
  table.remove()
  emitInput(host)
}

/** True если caret сейчас внутри <table> в данном host'е. */
export function isInTable(host: HTMLElement): boolean {
  return findTable(host) !== null
}
