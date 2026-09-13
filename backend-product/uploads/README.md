# Article files

Put article files such as PDFs or DOCX files in this folder when using the existing `filePath` upload mode.

The recommended method is to create the article through `POST /api/articles` with a multipart `file` field. The backend saves the uploaded file here automatically, records its private path in PostgreSQL, and serves it to authenticated users through `/api/downloads/:articleId` after ownership is confirmed.

Do not expose this folder as a public static directory.
