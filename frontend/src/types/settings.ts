// GET/PUT /api/settings のレスポンス型
export interface Settings {
  csvDefaultPath: string | null
  googleDriveFolderId: string | null
}
