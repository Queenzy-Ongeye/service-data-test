import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const BleServiceInterface = () => {
  const [bleDeviceList, setBleDeviceList] = useState([]);
  const [keyword] = useState("OVES");
  const [loadingTotal, setLoadingTotal] = useState(0);
  const [loadingCurrent, setLoadingCurrent] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Connecting Bluetooth device");
  const [macAddress, setMacAddress] = useState("");
  const [serviceStatus, setServiceStatus] = useState({
    progress: 0,
    status: "idle",
    lastUpdate: null,
  });

  useEffect(() => {
    setupBridge();
  }, []);

  const setupBridge = () => {
    if (window.WebViewJavascriptBridge) {
      initializeBridge(window.WebViewJavascriptBridge);
    } else {
      document.addEventListener(
        "WebViewJavascriptBridgeReady",
        () => initializeBridge(window.WebViewJavascriptBridge),
        false
      );
    }
  };

  const initializeBridge = (bridge) => {
    bridge.init((message, responseCallback) => {
      responseCallback("js success!");
    });

    // Register handlers for bridge callbacks
    bridge.registerHandler(
      "findBleDeviceCallBack",
      (data, responseCallback) => {
        const resp = JSON.parse(data);
        setBleDeviceList((prevList) => {
          const deviceExists = prevList.some(
            (device) => device.macAddress === resp.macAddress
          );
          if (deviceExists) {
            return prevList.map((device) =>
              device.macAddress === resp.macAddress ? resp : device
            );
          }
          return [...prevList, resp];
        });
      }
    );

    bridge.registerHandler(
      "bleConnectSuccessCallBack",
      (receivedMacAddress) => {
        setLoadingMsg("Connect Success");
        setServiceStatus((prev) => ({
          ...prev,
          status: "connected",
          lastUpdate: new Date().toISOString(),
        }));
        if (receivedMacAddress === macAddress) {
          window.location.href = `./BleServiceList.html?macAddress=${macAddress}`;
        } else {
          setIsDialogOpen(false);
        }
      }
    );

    bridge.registerHandler("bleConnectFailCallBack", () => {
      setIsDialogOpen(false);
      setServiceStatus((prev) => ({
        ...prev,
        status: "connection failed",
        lastUpdate: new Date().toISOString(),
      }));
      callHandler("toastMsg", "bleConnectFailCallBack");
    });

    bridge.registerHandler("bleInitServiceDataOnProgressCallBack", (data) => {
      console.log("Progress update received:", data);
      const obj = JSON.parse(data);
      setLoadingTotal(obj.total);
      setLoadingCurrent(obj.progress);
      setServiceStatus((prev) => ({
        progress: Math.round((obj.progress / obj.total) * 100),
        status: "receiving data",
        lastUpdate: new Date().toISOString(),
      }));
    });

    bridge.registerHandler("bleInitServiceDataOnCompleteCallBack", (data) => {
      console.log("Service data initialization complete:", data);
      setIsDialogOpen(false);
      setServiceStatus((prev) => ({
        ...prev,
        status: "completed",
        lastUpdate: new Date().toISOString(),
      }));
    });

    bridge.registerHandler("bleInitServiceDataFailureCallBack", (data) => {
      console.log("Service data initialization failed:", data);
      setIsDialogOpen(false);
      setServiceStatus((prev) => ({
        ...prev,
        status: "failed",
        lastUpdate: new Date().toISOString(),
      }));
    });
  };

  const callHandler = (handlerName, data) => {
    if (window.WebViewJavascriptBridge) {
      window.WebViewJavascriptBridge.callHandler(
        handlerName,
        data,
        (responseData) => {
          console.log(`${handlerName} response:`, responseData);
        }
      );
    }
  };

  const startBleScan = () => {
    setBleDeviceList([]);
    callHandler("startBleScan", keyword);
  };

  const stopBleScan = () => {
    callHandler("stopBleScan", "");
  };

  const connBleByMacAddress = (item) => {
    setMacAddress(item.macAddress);
    setIsDialogOpen(true);
    setLoadingMsg("Connecting Bluetooth device");
    setServiceStatus((prev) => ({
      ...prev,
      status: "connecting",
      lastUpdate: new Date().toISOString(),
    }));
    callHandler("connBleByMacAddress", item.macAddress);
  };

  const initServiceBleData = () => {
    if (!macAddress) {
      callHandler("toastMsg", "Please connect to a device first");
      return;
    }

    setIsDialogOpen(true);
    setLoadingMsg("Initializing Service Data");
    setServiceStatus((prev) => ({
      ...prev,
      status: "initializing",
      lastUpdate: new Date().toISOString(),
    }));

    const data = {
      serviceName: "ATT", // ATT/STS/DIA/CMD
      macAddress: macAddress,
    };
    console.log("Initializing service data with:", data);
    callHandler("initServiceBleData", data);
  };

  return (
    <div className="flex-1 h-4/5 flex flex-col flex-wrap justify-center items-center bg-black">
      <div className="w-full max-w-2xl mb-4">
        <div>
          <span>Service Data Status</span>
        </div>
        <div>
          <div className="space-y-2">
            <div>Status: {serviceStatus.status}</div>
            {serviceStatus.progress > 0 && (
              <div>Progress: {serviceStatus.progress}%</div>
            )}
            {serviceStatus.lastUpdate && (
              <div>
                Last Update:{" "}
                {new Date(serviceStatus.lastUpdate).toLocaleTimeString()}
              </div>
            )}
            <button
              className="w-full h-12 mt-2 px-4 bg-green-500 text-white rounded"
              onClick={initServiceBleData}
            >
              Initialize Service Data
            </button>
          </div>
        </div>
      </div>

      <div className="h-12 flex flex-row flex-wrap justify-center items-center">
        <button
          className="h-12 mt-2 px-4 bg-blue-500 text-white rounded"
          onClick={startBleScan}
        >
          startBleScan
        </button>
        <button
          className="h-12 mt-2 ml-2 px-4 bg-blue-500 text-white rounded"
          onClick={stopBleScan}
        >
          stopBleScan
        </button>
      </div>

      {bleDeviceList.map((item, index) => (
        <div
          key={index}
          className="w-full h-16 flex flex-row flex-wrap items-center justify-between bg-white mt-2 px-4"
        >
          <div>{item.name}</div>
          <div>{item.macAddress}</div>
          <button
            className="h-12 px-4 bg-blue-500 text-white rounded"
            onClick={() => connBleByMacAddress(item)}
          >
            connectBle
          </button>
        </div>
      ))}

      {isDialogOpen && (
        <div>
          <div className="w-72 p-5 rounded-lg bg-white shadow-lg text-center">
            <div>{loadingMsg}</div>
            <progress
              className="w-full mt-4"
              value={loadingCurrent}
              max={loadingTotal}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BleServiceInterface;
