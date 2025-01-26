declare module './db.view' {
  interface DBView {
    addObject: (obj: any) => void;
    handleNewObject: (obj: any) => void;
  }
}