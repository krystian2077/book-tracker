# Sample CSV files for manual testing

Use these files in the app under **Add book → Import CSV** or **Import by ISBN**.

| File | Tab | Description |
|------|-----|-------------|
| `books-import-test.csv` | **Import CSV** | 5 classic books with title, author, ISBN, pages, and rating — shows the preview table before upload |
| `isbn-import-5-books.csv` | **Import by ISBN** | 5 ISBNs only — triggers Open Library / Google Books lookup and bulk add |

## How to test (local or deployed)

1. Log in with the demo account (**Try the demo account** → `demo` / `DemoPassword123!`).
2. Go to **Add book**.
3. Choose the tab that matches the file above.
4. Upload the CSV from this folder.
5. Review the preview, then confirm import.

> These files are safe to import into the demo account — they use real, valid ISBNs. Duplicate ISBNs already in your library will be reported as errors (expected behaviour).
