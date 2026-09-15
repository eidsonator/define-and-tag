import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listListsTool from "./tools/list-lists";
import createListTool from "./tools/create-list";
import renameListTool from "./tools/rename-list";
import deleteListTool from "./tools/delete-list";
import listWordsTool from "./tools/list-words";
import saveWordTool from "./tools/save-word";
import updateWordTool from "./tools/update-word";
import deleteWordTool from "./tools/delete-word";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "word-keeper-pro",
  title: "Word Keeper Pro",
  version: "1.0.0",
  instructions:
    "Tools for the Word Keeper Pro dictionary app. Use list_lists, create_list, rename_list and delete_list to manage the signed-in user's word lists, and list_words, save_word, update_word and delete_word to manage their saved words, notes and tags.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listListsTool,
    createListTool,
    renameListTool,
    deleteListTool,
    listWordsTool,
    saveWordTool,
    updateWordTool,
    deleteWordTool,
  ],
});
