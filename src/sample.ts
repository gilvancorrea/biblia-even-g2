export async function loadBibleText(): Promise<string> {
  const response = await fetch("/bible/blivre.json");
  const bible = await response.json();

  // O primeiro item é metadado. Os livros começam depois dele.
  const books = bible.slice(1);

  const genesis = books.find((book: any) => book.nome === "Gênesis");

  if (!genesis) {
    return "Bíblia Even\n\nNão foi possível encontrar o livro de Gênesis.";
  }

  const chapterNumber = 1;
  const verses = genesis.capitulos[chapterNumber - 1];

  const formattedVerses = verses
    .map((text: string, index: number) => `${chapterNumber}:${index + 1} ${text}`)
    .join("\n\n");

  return `Bíblia Livre\nGênesis ${chapterNumber}\n\n${formattedVerses}`;
}
