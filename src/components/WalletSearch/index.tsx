import { Search } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { FC, useEffect, useState } from "react";

export const WalletSearch: FC = () => {
  const [wallet, setWallet] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null)
  const router = useRouter();

  useEffect(() => {
    if (!wallet) {
      setWalletError(null)
      return
    }
    try {
      new PublicKey(wallet)
    } catch (err: any) {
      setWalletError('Invalid wallet address')
    }
  }, [wallet])

  function onSubmit() {
    if (walletError || !wallet) {
      return;
    }

    router.push(`/wallet/${wallet}`);
  }
  
  return (
    <TextField
      error={!!walletError}
      label="View any wallet"
      value={wallet}
      onChange={e => setWallet(e.target.value)}
      helperText={walletError}
      sx={{ minWidth: "350px" }}
      InputProps={{
        endAdornment: <InputAdornment position="end">
        <IconButton
          aria-label="toggle password visibility"
          onClick={onSubmit}
          edge="end"
        >
          {<Search />}
        </IconButton>
      </InputAdornment>
      }}
    />   
  )
}