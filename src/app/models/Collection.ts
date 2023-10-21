export class Collection {
  public id: string
  public image?: string
  constructor({ id, image }: Collection) {
    this.id = id
    this.image = image
  }
}
