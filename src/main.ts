import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'

type BibleBook = {
  periodo: string
  nome: string
  abrev: string
  capitulos: string[][]
}

const BODY_W = 576
const BODY_H = 230
const BODY_PAD = 4
const BODY_BORDER = 0

let pages: string[] = ['Carregando Bíblia Livre...']
let currentPage = 0

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main style="margin:auto;padding:24px;max-width:680px;box-sizing:border-box;color:#c7ffc7;font-family:Arial, sans-serif;">
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h1 style="font-size:20px;font-weight:700;margin:0;color:#dfffdc;">Bíblia Even</h1>
      <span id="pageCount" style="font-size:14px;color:#9bdc9b;"></span>
    </header>

    <pre id="mirror" style="background:#111;border:1px solid #2e5f2e;border-radius:12px;padding:20px;font-size:20px;line-height:1.45;white-space:pre-wrap;word-break:break-word;color:#dfffdc;margin:0;"></pre>

    <footer style="font-size:13px;color:#8ccf8c;text-align:center;margin-top:16px;">
      Toque: próxima · deslize: anterior · toque duplo: sair
    </footer>
  </main>
`

function renderPreview() {
  const mirror = document.getElementById('mirror')
  const count = document.getElementById('pageCount')

  if (mirror) mirror.textContent = pages[currentPage] ?? ''
  if (count) count.textContent = `${currentPage + 1} / ${pages.length}`
}

function splitIntoPages(text: string, size = 330): string[] {
  const result: string[] = []
  let remaining = text.trim()

  while (remaining.length > 0) {
    let chunk = remaining.slice(0, size)
    const lastBreak = chunk.lastIndexOf('\n\n')
    const lastSpace = chunk.lastIndexOf(' ')

    if (lastBreak > 120) {
      chunk = chunk.slice(0, lastBreak)
    } else if (lastSpace > 200) {
      chunk = chunk.slice(0, lastSpace)
    }

    result.push(chunk.trim())
    remaining = remaining.slice(chunk.length).trim()
  }

  return result.length ? result : ['Texto vazio']
}

async function loadGenesisOne(): Promise<string> {
  const response = await fetch('/bible/blivre.json')

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status}`)
  }

  const bible = await response.json()
  const books: BibleBook[] = bible.slice(1)

  const genesis = books.find(book => book.nome === 'Gênesis')

  if (!genesis) {
    throw new Error('Livro de Gênesis não encontrado')
  }

  const chapterNumber = 1
  const verses = genesis.capitulos[chapterNumber - 1]

  if (!verses || !Array.isArray(verses)) {
    throw new Error('Capítulo 1 de Gênesis não encontrado')
  }

  return `Bíblia Livre
Gênesis ${chapterNumber}

${verses.map((verse, index) => `${chapterNumber}:${index + 1} ${verse}`).join('\n\n')}`
}

function pagerLabel() {
  return `${currentPage + 1}/${pages.length}`
}

async function start() {
  renderPreview()

  try {
    const text = await loadGenesisOne()
    pages = splitIntoPages(text)
    currentPage = 0
    renderPreview()
  } catch (error) {
    pages = [
      `Bíblia Even

Erro ao carregar a Bíblia.

Verifique:
public/bible/blivre.json

${String(error)}`,
    ]
    currentPage = 0
    renderPreview()
    return
  }

  let bridge

  try {
    bridge = await waitForEvenAppBridge()
  } catch (error) {
    console.warn('Even bridge não disponível no navegador:', error)
    return
  }

  const body = new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: BODY_W,
    height: BODY_H,
    borderWidth: BODY_BORDER,
    borderColor: 5,
    paddingLength: BODY_PAD,
    containerID: 1,
    containerName: 'body',
    content: pages[0] ?? '(empty)',
    isEventCapture: 1,
  })

  const pager = new TextContainerProperty({
    xPosition: 0,
    yPosition: 245,
    width: 576,
    height: 35,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 4,
    containerID: 2,
    containerName: 'pager',
    content: pagerLabel(),
    isEventCapture: 0,
  })

  const created = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 2,
      textObject: [body, pager],
    }),
  )

  if (created !== 0) {
    console.error('createStartUpPageContainer failed:', created)
  }

  let rendering: Promise<unknown> = Promise.resolve()

  async function showPage(index: number) {
    if (index < 0 || index >= pages.length || index === currentPage) return

    currentPage = index

    rendering = rendering.then(async () => {
      await bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: 1,
          containerName: 'body',
          content: pages[index],
        }),
      )

      await bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: 2,
          containerName: 'pager',
          content: pagerLabel(),
        }),
      )
    })

    await rendering
    renderPreview()
  }

  let cleanedUp = false
  let unsubscribe = () => {}

  function cleanup() {
    if (cleanedUp) return
    cleanedUp = true
    unsubscribe()
  }

  unsubscribe = bridge.onEvenHubEvent(event => {
    const sysType = event.sysEvent?.eventType ?? null
    const textType = event.textEvent?.eventType ?? null

    if (
      sysType === OsEventTypeList.DOUBLE_CLICK_EVENT ||
      textType === OsEventTypeList.DOUBLE_CLICK_EVENT
    ) {
      bridge.shutDownPageContainer(1)
      return
    }

    if (textType === OsEventTypeList.SCROLL_TOP_EVENT) {
      showPage(currentPage - 1).catch(err => console.error(err))
      return
    }

    if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      showPage(currentPage + 1).catch(err => console.error(err))
      return
    }

    if (sysType === OsEventTypeList.CLICK_EVENT) {
      showPage(currentPage + 1).catch(err => console.error(err))
      return
    }

    if (
      sysType === OsEventTypeList.SYSTEM_EXIT_EVENT ||
      sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT
    ) {
      cleanup()
    }
  })

  window.addEventListener('beforeunload', cleanup)
}

document.body.addEventListener('click', () => {
  if (currentPage < pages.length - 1) {
    currentPage++
  } else {
    currentPage = 0
  }

  renderPreview()
})

start()
