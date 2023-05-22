import { Link, Stack, Typography } from '@mui/material';
import { FC, useEffect, useState } from 'react';
import { shorten } from '../Item';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';

type CopyAddressProps = {
  children: string;
};

export const CopyAddress: FC<CopyAddressProps> = ({ children }) => {
  const [copied, setCopied] = useState(false);

  function copyPk() {
    navigator.clipboard.writeText(children);
    setCopied(true);
  }

  useEffect(() => {
    if (!copied) return;

    const id = setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => {
      clearTimeout(id);
    };
  }, [copied]);

  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
      <Link href={`https://solscan.io/token/${children}`} target="_blank">
        <img src="/solscan.png" width="15px" style={{ display: 'block' }} />
      </Link>
      <Typography>{shorten(children)}</Typography>
      {copied ? (
        <DoneIcon fontSize="small" color="success" />
      ) : (
        <ContentCopyIcon sx={{ cursor: 'pointer' }} fontSize="small" onClick={copyPk} />
      )}
    </Stack>
  );
};
