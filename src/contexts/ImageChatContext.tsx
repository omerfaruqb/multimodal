import { createContext, FC, ReactNode, useContext, useEffect, useState } from "react";
import { MultimodalLiveClient } from "../lib/multimodal-live-client";
import { LiveConfig } from "../multimodal-live-types";

const ImageChatContext = createContext<{
  client: MultimodalLiveClient;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
} | undefined>(undefined);

export type ImageChatProviderProps = {
  children: ReactNode;
  url?: string;
  apiKey: string;
};

export const ImageChatProvider: FC<ImageChatProviderProps> = ({
  url,
  apiKey,
  children,
}) => {
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [client] = useState(() => new MultimodalLiveClient({ url, apiKey }));

  useEffect(() => {
    const onClose = () => {
      setConnected(false);
    };

    client.on("close", onClose);

    return () => {
      client.off("close", onClose);
    };
  }, [client]);

  const connect = async () => {
    const config: LiveConfig = {
      model: "models/gemini-2.0-flash-thinking-exp",
    };
    
    client.disconnect();
    await client.connect(config);
    setConnected(true);
  };

  const disconnect = async () => {
    client.disconnect();
    setConnected(false);
  };

  return (
    <ImageChatContext.Provider value={{ client, connected, connect, disconnect, volume }}>
      {children}
    </ImageChatContext.Provider>
  );
};

export const useImageChatContext = () => {
  const context = useContext(ImageChatContext);
  if (!context) {
    throw new Error("useImageChatContext must be used within an ImageChatProvider");
  }
  return context;
};

export default ImageChatProvider;

