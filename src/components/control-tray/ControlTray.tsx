/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from "classnames";
import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";
import { AIResponse } from '../../App';

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
  aiResponse: AIResponse | null;
};

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
  aiResponse,
}: ControlTrayProps) {
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const previousConnectedState = useRef(false);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  // Handle initial connection and AI response
  useEffect(() => {
    if (connected && !previousConnectedState.current && aiResponse) {
      // Send initial context when streaming starts
      const parts = [];

      // Add the initial response prompt
      parts.push({
        text: `⁠User has sent you a question; use the provided solution to answer it. 
        The original question is also given as image input to you. Before starting to solve the problem, 
        ask the user if he/she has any spesific questions about the problem.
        Solution: ${aiResponse.content}`
      });

      // Add the image if available
      if (aiResponse.imageData) {
        parts.push({
          inlineData: {
            data: aiResponse.imageData.base64,
            mimeType: aiResponse.imageData.mimeType
          }
        });
      }

      // Send both text and image
      client.send(parts, true);
    }
    previousConnectedState.current = connected;
  }, [connected, aiResponse, client]);

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = async (base64: string) => {
      try {
        await client.sendRealtimeInput([
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64,
          },
        ]);
      } catch (error) {
        console.error('Error sending audio data:', error);
      }
    };

    const startAudioRecording = async () => {
      try {
        // Request audio permissions explicitly
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (connected && !muted && audioRecorder) {
          await audioRecorder
            .on("data", onData)
            .on("volume", setInVolume)
            .start();
          console.log('Audio recording started successfully');
        }
      } catch (error) {
        console.error('Error starting audio recording:', error);
        setMuted(true); // Mute if there's an error
      }
    };

    if (connected && !muted) {
      startAudioRecording();
    } else {
      audioRecorder.stop();
    }

    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  // Add mic permission check
  const handleMicToggle = async () => {
    try {
      if (muted) {
        // Try to get audio permission before unmuting
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      setMuted(!muted);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Mikrofona erişilemiyor. Lütfen tarayıcı izinlerinizi kontrol edin.');
      setMuted(true);
    }
  };

  return (
    <section className="control-tray">
      <nav className={cn("actions-nav", { disabled: !connected })}>
        <button
          className={cn("action-button mic-button")}
          onClick={handleMicToggle}
          title={muted ? "Mikrofonu aç" : "Mikrofonu kapat"}
        >
          {!muted ? (
            <span className="material-symbols-outlined filled">mic</span>
          ) : (
            <span className="material-symbols-outlined filled">mic_off</span>
          )}
        </button>

        <div className="action-button no-action outlined">
          <AudioPulse volume={volume} active={connected && !muted} hover={false} />
        </div>

        {children}
      </nav>

      <div className={cn("connection-container", { connected })}>
        <div className="connection-button-container">
          <button
            ref={connectButtonRef}
            className={cn("action-button connect-toggle", { connected })}
            onClick={connected ? disconnect : connect}
            disabled={!aiResponse}
            title={!aiResponse ? "Önce bir görüntü yükleyin ve analiz edin" : "Yayını başlat/durdur"}
          >
            <span className="material-symbols-outlined filled">
              {connected ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>
        <span className="text-indicator">Yayın</span>
      </div>
    </section>
  );
}

export default memo(ControlTray);