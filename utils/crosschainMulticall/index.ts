import { Interface } from "@ethersproject/abi";
import lzMulticallAbi from "./lzMulticallAbi";
import endpointAbi from "./endpointAbi";
import { Web3FunctionResult, Web3FunctionResultCallData } from "@gelatonetwork/web3-functions-sdk/*";
import { Contract, ethers } from "ethers";
import { StaticJsonRpcProvider } from "@ethersproject/providers";

const LZ_MULTICALL_SENDER_RECEIVER_ADDRESS = "0x84C9Bb8B81037C642f2Eb6486a9bdfF526CdEbe0";
const iface = new Interface(lzMulticallAbi);


export const wrap = async (localProvider: StaticJsonRpcProvider, lzChainId: number, web3FunctionResult: Web3FunctionResult): Promise<Web3FunctionResult> => {
    const calls = web3FunctionResult.callData.map((callData: Web3FunctionResultCallData) => ({
        to: callData.to,
        value: callData.value || "0",
        data: callData.data
    }));

    const payload = ethers.utils.defaultAbiCoder.encode(
        [{
            type: 'tuple[]',
            components: [
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'data', type: 'bytes' }
            ]
        }],
        [calls]
    );

    const lzMulticallContract = new Contract(LZ_MULTICALL_SENDER_RECEIVER_ADDRESS, lzMulticallAbi, localProvider);
    const lzEndpoint = new Contract(await lzMulticallContract.lzEndpoint(), endpointAbi, localProvider);
    const fee = (await lzEndpoint.estimateFees(lzChainId, LZ_MULTICALL_SENDER_RECEIVER_ADDRESS, payload, false, "0x"))[0];

    return {
        canExec: web3FunctionResult.canExec,
        callData: [
            {
                to: LZ_MULTICALL_SENDER_RECEIVER_ADDRESS,
                data: iface.encodeFunctionData("send", [lzChainId, calls]),
                value: fee.toString()
            }
        ]
    }
}
