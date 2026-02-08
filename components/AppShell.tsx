"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import MenuIcon from "@mui/icons-material/Menu";

type PlayerLink = { name: string; key: string };

export function AppShell({ players, children }: { players: PlayerLink[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar
        position="sticky"
        color="primary"
        elevation={1}
        sx={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(17,24,39,0.9)" }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", minHeight: 48, px: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Link href="/" legacyBehavior passHref>
              <Box
                component="a"
                sx={{ display: "inline-flex", alignItems: "center", gap: 1, textDecoration: "none", color: "inherit" }}
              >
                <Box component="img" src="/logo.png" alt="Digital Dungeon Master" sx={{ height: 28, width: "auto" }} />
                <Typography variant="caption" color="text.secondary">
                  v0.01
                </Typography>
              </Box>
            </Link>
          </Box>
          <Tooltip title="Menu">
            <IconButton color="inherit" size="small" onClick={() => setOpen(true)} aria-label="open menu">
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={open} onClose={close}>
        <Box
          sx={{ width: 280, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}
          role="presentation"
        >
          <Box>
            <List subheader={<Typography sx={{ px: 2, pt: 1, pb: 0.5 }}>Players</Typography>}>
              {players.map((p) => (
                <ListItem key={p.key} disablePadding sx={{ pl: 1 }}>
                  <Link href={`/p/${encodeURIComponent(p.key)}`} legacyBehavior passHref>
                    <ListItemButton onClick={close} component="a">
                      <ListItemText primary={p.name} secondary={`Key: ${p.key}`} />
                    </ListItemButton>
                  </Link>
                </ListItem>
              ))}
              {players.length === 0 && (
                <ListItem>
                  <ListItemText primary="No players loaded" />
                </ListItem>
              )}
            </List>
            <Divider />
            <List>
              <ListItem disablePadding>
                <Link href="/reference" legacyBehavior passHref>
                  <ListItemButton onClick={close} component="a">
                    <ListItemText primary="Reference" />
                  </ListItemButton>
                </Link>
              </ListItem>
            </List>
          </Box>

          <Box>
            <Divider />
            <List>
              <ListItem disablePadding>
                <Link href="/dm" legacyBehavior passHref>
                  <ListItemButton onClick={close} component="a">
                    <ListItemText primary="Dungeon Master Console" />
                  </ListItemButton>
                </Link>
              </ListItem>
            </List>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ width: "100%", maxWidth: 1400, mx: "auto", flex: 1 }}>
        <Box sx={{ p: 3, pt: 4 }}>{children}</Box>
        <Box
          component="footer"
          sx={{
            backgroundColor: "rgba(17,24,39,0.9)",
            color: "#fff",
            px: 2,
            py: 1.5,
            textAlign: "center",
            fontSize: "0.9rem"
          }}
        >
          Quick POC for running one-shots over Discord.
        </Box>
      </Box>
    </Box>
  );
}

