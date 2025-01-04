/** @format */

import type { UserConfig } from "vite"
import { viteStaticCopy } from "vite-plugin-static-copy"

export default {
  base: "/klassik/",
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "./COPYING.html",
          dest: "",
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        howToPlay: "how_to_play.html",
      },
    },
  },
} satisfies UserConfig
