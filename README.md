# Word Keeper Pro

I’d like to create a dictionary app. It should require a login with the password. They should use a free API from a Dictionary website for the backend. It should have a search bar with fuzzy finding. after a word is found, and the definition is given it should offer an option to save the word to the users’s Word list. It should support multiple word list. Words should be able to be tagged and save notes to them.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://define-and-tag.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ec6b529-efe9-4225-907f-92c911c736c2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Dictionary API configuration

Set these server-side environment variables before starting the app:

```sh
MERRIAM_WEBSTER_API_KEY=your_collegiate_dictionary_key
MERRIAM_WEBSTER_THESAURUS_API_KEY=your_collegiate_thesaurus_key
```

The thesaurus key is optional. When it is configured, search results display synonyms and antonyms for entries Merriam-Webster can match; definitions continue to work if the thesaurus has no match or is unavailable.
