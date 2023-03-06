import { v4 as uuid } from "uuid";
import { FC, createContext, useContext, useEffect, useState } from "react";
import { useDatabase } from "./database";
import { useLiveQuery } from "dexie-react-hooks";
import { toPairs } from "lodash";

const TagsContext = createContext();

type Tag = {
  id: typeof uuid;
  name?: string;
}

type TagsProviderProps = {
  children: JSX.Element;
}

export const TagsProvider: FC<TagsProviderProps> = ({ children }) => {
  const { db } = useDatabase();
  const tags = useLiveQuery(() => db && db
    .tags
    .toArray(),
    [db],
    []
  ) || []

  async function addTag(name: string, color: string) {
    console.log('adding', name, color)
    await db.tags.add({
      name,
      color,
      id: uuid()
    })
  }

  async function updateTag(id: typeof uuid, name: string, color: string) {
    await db.tags.update(id, { name, color })
  }

  async function addNftsToTag(tagId: string, nftMints: string[]) {
    await db.taggedNfts.bulkPut(nftMints.map(nftId => {
      return {
        nftId,
        tagId
      }
    }))
  }

  async function removeNftsFromTag(tagId: string, nftMints: string[]) {
    await db
      .taggedNfts
      .where({ tagId })
      .and(item => nftMints.includes(item.nftId))
      .delete()
  }

  async function deleteTag(tagId: string) {
    await db.transaction('rw', db.tags, db.taggedNfts, async () => {
      await db.taggedNfts.where({ tagId }).delete();
      await db.tags.where({ id: tagId }).delete();
    });
  }

  return (
    <TagsContext.Provider value={{
      addTag,
      updateTag,
      deleteTag,
      addNftsToTag,
      removeNftsFromTag,
      tags
    }}>
      { children }
    </TagsContext.Provider>
  )
}

export const useTags = () => {
  return useContext(TagsContext);
}