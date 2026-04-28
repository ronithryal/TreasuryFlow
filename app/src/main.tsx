import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { Web3Provider } from "./web3/Web3Provider";
import { TestnetHydrator } from "./web3/TestnetHydrator";
import { IS_TESTNET } from "./web3/mode";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {IS_TESTNET ? (
      <Web3Provider>
        <TestnetHydrator />
        <App />
      </Web3Provider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
