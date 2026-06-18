export type Role = "user" | "assistant";
export type Attachment = { path: string };
export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
};
