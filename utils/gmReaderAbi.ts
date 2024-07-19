export default [
	{
		inputs: [{ internalType: "address", name: "market", type: "address" }],
		name: "DisabledMarket",
		type: "error",
	},
	{ inputs: [], name: "EmptyMarket", type: "error" },
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "address", name: "account", type: "address" },
			{ internalType: "uint256", name: "start", type: "uint256" },
			{ internalType: "uint256", name: "end", type: "uint256" },
		],
		name: "getAccountOrders",
		outputs: [
			{
				components: [
					{
						components: [
							{ internalType: "address", name: "account", type: "address" },
							{ internalType: "address", name: "receiver", type: "address" },
							{
								internalType: "address",
								name: "callbackContract",
								type: "address",
							},
							{
								internalType: "address",
								name: "uiFeeReceiver",
								type: "address",
							},
							{ internalType: "address", name: "market", type: "address" },
							{
								internalType: "address",
								name: "initialCollateralToken",
								type: "address",
							},
							{
								internalType: "address[]",
								name: "swapPath",
								type: "address[]",
							},
						],
						internalType: "struct Order.Addresses",
						name: "addresses",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "enum Order.OrderType",
								name: "orderType",
								type: "uint8",
							},
							{
								internalType: "enum Order.DecreasePositionSwapType",
								name: "decreasePositionSwapType",
								type: "uint8",
							},
							{
								internalType: "uint256",
								name: "sizeDeltaUsd",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "initialCollateralDeltaAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "triggerPrice",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "acceptablePrice",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "executionFee",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "callbackGasLimit",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "minOutputAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "updatedAtBlock",
								type: "uint256",
							},
						],
						internalType: "struct Order.Numbers",
						name: "numbers",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "bool", name: "isLong", type: "bool" },
							{
								internalType: "bool",
								name: "shouldUnwrapNativeToken",
								type: "bool",
							},
							{ internalType: "bool", name: "isFrozen", type: "bool" },
						],
						internalType: "struct Order.Flags",
						name: "flags",
						type: "tuple",
					},
				],
				internalType: "struct Order.Props[]",
				name: "",
				type: "tuple[]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				internalType: "contract IReferralStorage",
				name: "referralStorage",
				type: "address",
			},
			{ internalType: "bytes32[]", name: "positionKeys", type: "bytes32[]" },
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices[]",
				name: "prices",
				type: "tuple[]",
			},
			{ internalType: "address", name: "uiFeeReceiver", type: "address" },
		],
		name: "getAccountPositionInfoList",
		outputs: [
			{
				components: [
					{
						components: [
							{
								components: [
									{ internalType: "address", name: "account", type: "address" },
									{ internalType: "address", name: "market", type: "address" },
									{
										internalType: "address",
										name: "collateralToken",
										type: "address",
									},
								],
								internalType: "struct Position.Addresses",
								name: "addresses",
								type: "tuple",
							},
							{
								components: [
									{
										internalType: "uint256",
										name: "sizeInUsd",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "sizeInTokens",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "collateralAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "borrowingFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "fundingFeeAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "longTokenClaimableFundingAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "shortTokenClaimableFundingAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "increasedAtBlock",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "decreasedAtBlock",
										type: "uint256",
									},
								],
								internalType: "struct Position.Numbers",
								name: "numbers",
								type: "tuple",
							},
							{
								components: [
									{ internalType: "bool", name: "isLong", type: "bool" },
								],
								internalType: "struct Position.Flags",
								name: "flags",
								type: "tuple",
							},
						],
						internalType: "struct Position.Props",
						name: "position",
						type: "tuple",
					},
					{
						components: [
							{
								components: [
									{
										internalType: "bytes32",
										name: "referralCode",
										type: "bytes32",
									},
									{
										internalType: "address",
										name: "affiliate",
										type: "address",
									},
									{ internalType: "address", name: "trader", type: "address" },
									{
										internalType: "uint256",
										name: "totalRebateFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "traderDiscountFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "totalRebateAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "traderDiscountAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "affiliateRewardAmount",
										type: "uint256",
									},
								],
								internalType:
									"struct PositionPricingUtils.PositionReferralFees",
								name: "referral",
								type: "tuple",
							},
							{
								components: [
									{
										internalType: "uint256",
										name: "fundingFeeAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "claimableLongTokenAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "claimableShortTokenAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "latestFundingFeeAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "latestLongTokenClaimableFundingAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "latestShortTokenClaimableFundingAmountPerSize",
										type: "uint256",
									},
								],
								internalType: "struct PositionPricingUtils.PositionFundingFees",
								name: "funding",
								type: "tuple",
							},
							{
								components: [
									{
										internalType: "uint256",
										name: "borrowingFeeUsd",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "borrowingFeeAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "borrowingFeeReceiverFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "borrowingFeeAmountForFeeReceiver",
										type: "uint256",
									},
								],
								internalType:
									"struct PositionPricingUtils.PositionBorrowingFees",
								name: "borrowing",
								type: "tuple",
							},
							{
								components: [
									{
										internalType: "address",
										name: "uiFeeReceiver",
										type: "address",
									},
									{
										internalType: "uint256",
										name: "uiFeeReceiverFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "uiFeeAmount",
										type: "uint256",
									},
								],
								internalType: "struct PositionPricingUtils.PositionUiFees",
								name: "ui",
								type: "tuple",
							},
							{
								components: [
									{ internalType: "uint256", name: "min", type: "uint256" },
									{ internalType: "uint256", name: "max", type: "uint256" },
								],
								internalType: "struct Price.Props",
								name: "collateralTokenPrice",
								type: "tuple",
							},
							{
								internalType: "uint256",
								name: "positionFeeFactor",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "protocolFeeAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "positionFeeReceiverFactor",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "feeReceiverAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "feeAmountForPool",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "positionFeeAmountForPool",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "positionFeeAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "totalCostAmountExcludingFunding",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "totalCostAmount",
								type: "uint256",
							},
						],
						internalType: "struct PositionPricingUtils.PositionFees",
						name: "fees",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "int256",
								name: "priceImpactUsd",
								type: "int256",
							},
							{
								internalType: "uint256",
								name: "priceImpactDiffUsd",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "executionPrice",
								type: "uint256",
							},
						],
						internalType: "struct ReaderPricingUtils.ExecutionPriceResult",
						name: "executionPriceResult",
						type: "tuple",
					},
					{ internalType: "int256", name: "basePnlUsd", type: "int256" },
					{
						internalType: "int256",
						name: "uncappedBasePnlUsd",
						type: "int256",
					},
					{
						internalType: "int256",
						name: "pnlAfterPriceImpactUsd",
						type: "int256",
					},
				],
				internalType: "struct ReaderUtils.PositionInfo[]",
				name: "",
				type: "tuple[]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "address", name: "account", type: "address" },
			{ internalType: "uint256", name: "start", type: "uint256" },
			{ internalType: "uint256", name: "end", type: "uint256" },
		],
		name: "getAccountPositions",
		outputs: [
			{
				components: [
					{
						components: [
							{ internalType: "address", name: "account", type: "address" },
							{ internalType: "address", name: "market", type: "address" },
							{
								internalType: "address",
								name: "collateralToken",
								type: "address",
							},
						],
						internalType: "struct Position.Addresses",
						name: "addresses",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "sizeInUsd", type: "uint256" },
							{
								internalType: "uint256",
								name: "sizeInTokens",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "collateralAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "borrowingFactor",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "fundingFeeAmountPerSize",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "longTokenClaimableFundingAmountPerSize",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "shortTokenClaimableFundingAmountPerSize",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "increasedAtBlock",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "decreasedAtBlock",
								type: "uint256",
							},
						],
						internalType: "struct Position.Numbers",
						name: "numbers",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "bool", name: "isLong", type: "bool" },
						],
						internalType: "struct Position.Flags",
						name: "flags",
						type: "tuple",
					},
				],
				internalType: "struct Position.Props[]",
				name: "",
				type: "tuple[]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "address", name: "market", type: "address" },
			{ internalType: "bool", name: "isLong", type: "bool" },
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices",
				name: "prices",
				type: "tuple",
			},
		],
		name: "getAdlState",
		outputs: [
			{ internalType: "uint256", name: "", type: "uint256" },
			{ internalType: "bool", name: "", type: "bool" },
			{ internalType: "int256", name: "", type: "int256" },
			{ internalType: "uint256", name: "", type: "uint256" },
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "bytes32", name: "key", type: "bytes32" },
		],
		name: "getDeposit",
		outputs: [
			{
				components: [
					{
						components: [
							{ internalType: "address", name: "account", type: "address" },
							{ internalType: "address", name: "receiver", type: "address" },
							{
								internalType: "address",
								name: "callbackContract",
								type: "address",
							},
							{
								internalType: "address",
								name: "uiFeeReceiver",
								type: "address",
							},
							{ internalType: "address", name: "market", type: "address" },
							{
								internalType: "address",
								name: "initialLongToken",
								type: "address",
							},
							{
								internalType: "address",
								name: "initialShortToken",
								type: "address",
							},
							{
								internalType: "address[]",
								name: "longTokenSwapPath",
								type: "address[]",
							},
							{
								internalType: "address[]",
								name: "shortTokenSwapPath",
								type: "address[]",
							},
						],
						internalType: "struct Deposit.Addresses",
						name: "addresses",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "uint256",
								name: "initialLongTokenAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "initialShortTokenAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "minMarketTokens",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "updatedAtBlock",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "executionFee",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "callbackGasLimit",
								type: "uint256",
							},
						],
						internalType: "struct Deposit.Numbers",
						name: "numbers",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "bool",
								name: "shouldUnwrapNativeToken",
								type: "bool",
							},
						],
						internalType: "struct Deposit.Flags",
						name: "flags",
						type: "tuple",
					},
				],
				internalType: "struct Deposit.Props",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "market",
				type: "tuple",
			},
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices",
				name: "prices",
				type: "tuple",
			},
			{ internalType: "uint256", name: "longTokenAmount", type: "uint256" },
			{ internalType: "uint256", name: "shortTokenAmount", type: "uint256" },
			{ internalType: "address", name: "uiFeeReceiver", type: "address" },
		],
		name: "getDepositAmountOut",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "address", name: "marketKey", type: "address" },
			{
				components: [
					{ internalType: "uint256", name: "min", type: "uint256" },
					{ internalType: "uint256", name: "max", type: "uint256" },
				],
				internalType: "struct Price.Props",
				name: "indexTokenPrice",
				type: "tuple",
			},
			{ internalType: "uint256", name: "positionSizeInUsd", type: "uint256" },
			{
				internalType: "uint256",
				name: "positionSizeInTokens",
				type: "uint256",
			},
			{ internalType: "int256", name: "sizeDeltaUsd", type: "int256" },
			{ internalType: "bool", name: "isLong", type: "bool" },
		],
		name: "getExecutionPrice",
		outputs: [
			{
				components: [
					{ internalType: "int256", name: "priceImpactUsd", type: "int256" },
					{
						internalType: "uint256",
						name: "priceImpactDiffUsd",
						type: "uint256",
					},
					{ internalType: "uint256", name: "executionPrice", type: "uint256" },
				],
				internalType: "struct ReaderPricingUtils.ExecutionPriceResult",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "address", name: "key", type: "address" },
		],
		name: "getMarket",
		outputs: [
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "bytes32", name: "salt", type: "bytes32" },
		],
		name: "getMarketBySalt",
		outputs: [
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices",
				name: "prices",
				type: "tuple",
			},
			{ internalType: "address", name: "marketKey", type: "address" },
		],
		name: "getMarketInfo",
		outputs: [
			{
				components: [
					{
						components: [
							{ internalType: "address", name: "marketToken", type: "address" },
							{ internalType: "address", name: "indexToken", type: "address" },
							{ internalType: "address", name: "longToken", type: "address" },
							{ internalType: "address", name: "shortToken", type: "address" },
						],
						internalType: "struct Market.Props",
						name: "market",
						type: "tuple",
					},
					{
						internalType: "uint256",
						name: "borrowingFactorPerSecondForLongs",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "borrowingFactorPerSecondForShorts",
						type: "uint256",
					},
					{
						components: [
							{
								components: [
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "long",
										type: "tuple",
									},
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "short",
										type: "tuple",
									},
								],
								internalType: "struct MarketUtils.PositionType",
								name: "fundingFeeAmountPerSize",
								type: "tuple",
							},
							{
								components: [
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "long",
										type: "tuple",
									},
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "short",
										type: "tuple",
									},
								],
								internalType: "struct MarketUtils.PositionType",
								name: "claimableFundingAmountPerSize",
								type: "tuple",
							},
						],
						internalType: "struct ReaderUtils.BaseFundingValues",
						name: "baseFunding",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "bool", name: "longsPayShorts", type: "bool" },
							{
								internalType: "uint256",
								name: "fundingFactorPerSecond",
								type: "uint256",
							},
							{
								internalType: "int256",
								name: "nextSavedFundingFactorPerSecond",
								type: "int256",
							},
							{
								components: [
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "long",
										type: "tuple",
									},
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "short",
										type: "tuple",
									},
								],
								internalType: "struct MarketUtils.PositionType",
								name: "fundingFeeAmountPerSizeDelta",
								type: "tuple",
							},
							{
								components: [
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "long",
										type: "tuple",
									},
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "short",
										type: "tuple",
									},
								],
								internalType: "struct MarketUtils.PositionType",
								name: "claimableFundingAmountPerSizeDelta",
								type: "tuple",
							},
						],
						internalType:
							"struct MarketUtils.GetNextFundingAmountPerSizeResult",
						name: "nextFunding",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "uint256",
								name: "virtualPoolAmountForLongToken",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "virtualPoolAmountForShortToken",
								type: "uint256",
							},
							{
								internalType: "int256",
								name: "virtualInventoryForPositions",
								type: "int256",
							},
						],
						internalType: "struct ReaderUtils.VirtualInventory",
						name: "virtualInventory",
						type: "tuple",
					},
					{ internalType: "bool", name: "isDisabled", type: "bool" },
				],
				internalType: "struct ReaderUtils.MarketInfo",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices[]",
				name: "marketPricesList",
				type: "tuple[]",
			},
			{ internalType: "uint256", name: "start", type: "uint256" },
			{ internalType: "uint256", name: "end", type: "uint256" },
		],
		name: "getMarketInfoList",
		outputs: [
			{
				components: [
					{
						components: [
							{ internalType: "address", name: "marketToken", type: "address" },
							{ internalType: "address", name: "indexToken", type: "address" },
							{ internalType: "address", name: "longToken", type: "address" },
							{ internalType: "address", name: "shortToken", type: "address" },
						],
						internalType: "struct Market.Props",
						name: "market",
						type: "tuple",
					},
					{
						internalType: "uint256",
						name: "borrowingFactorPerSecondForLongs",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "borrowingFactorPerSecondForShorts",
						type: "uint256",
					},
					{
						components: [
							{
								components: [
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "long",
										type: "tuple",
									},
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "short",
										type: "tuple",
									},
								],
								internalType: "struct MarketUtils.PositionType",
								name: "fundingFeeAmountPerSize",
								type: "tuple",
							},
							{
								components: [
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "long",
										type: "tuple",
									},
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "short",
										type: "tuple",
									},
								],
								internalType: "struct MarketUtils.PositionType",
								name: "claimableFundingAmountPerSize",
								type: "tuple",
							},
						],
						internalType: "struct ReaderUtils.BaseFundingValues",
						name: "baseFunding",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "bool", name: "longsPayShorts", type: "bool" },
							{
								internalType: "uint256",
								name: "fundingFactorPerSecond",
								type: "uint256",
							},
							{
								internalType: "int256",
								name: "nextSavedFundingFactorPerSecond",
								type: "int256",
							},
							{
								components: [
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "long",
										type: "tuple",
									},
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "short",
										type: "tuple",
									},
								],
								internalType: "struct MarketUtils.PositionType",
								name: "fundingFeeAmountPerSizeDelta",
								type: "tuple",
							},
							{
								components: [
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "long",
										type: "tuple",
									},
									{
										components: [
											{
												internalType: "uint256",
												name: "longToken",
												type: "uint256",
											},
											{
												internalType: "uint256",
												name: "shortToken",
												type: "uint256",
											},
										],
										internalType: "struct MarketUtils.CollateralType",
										name: "short",
										type: "tuple",
									},
								],
								internalType: "struct MarketUtils.PositionType",
								name: "claimableFundingAmountPerSizeDelta",
								type: "tuple",
							},
						],
						internalType:
							"struct MarketUtils.GetNextFundingAmountPerSizeResult",
						name: "nextFunding",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "uint256",
								name: "virtualPoolAmountForLongToken",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "virtualPoolAmountForShortToken",
								type: "uint256",
							},
							{
								internalType: "int256",
								name: "virtualInventoryForPositions",
								type: "int256",
							},
						],
						internalType: "struct ReaderUtils.VirtualInventory",
						name: "virtualInventory",
						type: "tuple",
					},
					{ internalType: "bool", name: "isDisabled", type: "bool" },
				],
				internalType: "struct ReaderUtils.MarketInfo[]",
				name: "",
				type: "tuple[]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "market",
				type: "tuple",
			},
			{
				components: [
					{ internalType: "uint256", name: "min", type: "uint256" },
					{ internalType: "uint256", name: "max", type: "uint256" },
				],
				internalType: "struct Price.Props",
				name: "indexTokenPrice",
				type: "tuple",
			},
			{
				components: [
					{ internalType: "uint256", name: "min", type: "uint256" },
					{ internalType: "uint256", name: "max", type: "uint256" },
				],
				internalType: "struct Price.Props",
				name: "longTokenPrice",
				type: "tuple",
			},
			{
				components: [
					{ internalType: "uint256", name: "min", type: "uint256" },
					{ internalType: "uint256", name: "max", type: "uint256" },
				],
				internalType: "struct Price.Props",
				name: "shortTokenPrice",
				type: "tuple",
			},
			{ internalType: "bytes32", name: "pnlFactorType", type: "bytes32" },
			{ internalType: "bool", name: "maximize", type: "bool" },
		],
		name: "getMarketTokenPrice",
		outputs: [
			{ internalType: "int256", name: "", type: "int256" },
			{
				components: [
					{ internalType: "int256", name: "poolValue", type: "int256" },
					{ internalType: "int256", name: "longPnl", type: "int256" },
					{ internalType: "int256", name: "shortPnl", type: "int256" },
					{ internalType: "int256", name: "netPnl", type: "int256" },
					{ internalType: "uint256", name: "longTokenAmount", type: "uint256" },
					{
						internalType: "uint256",
						name: "shortTokenAmount",
						type: "uint256",
					},
					{ internalType: "uint256", name: "longTokenUsd", type: "uint256" },
					{ internalType: "uint256", name: "shortTokenUsd", type: "uint256" },
					{
						internalType: "uint256",
						name: "totalBorrowingFees",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "borrowingFeePoolFactor",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "impactPoolAmount",
						type: "uint256",
					},
				],
				internalType: "struct MarketPoolValueInfo.Props",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "uint256", name: "start", type: "uint256" },
			{ internalType: "uint256", name: "end", type: "uint256" },
		],
		name: "getMarkets",
		outputs: [
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props[]",
				name: "",
				type: "tuple[]",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "market",
				type: "tuple",
			},
			{
				components: [
					{ internalType: "uint256", name: "min", type: "uint256" },
					{ internalType: "uint256", name: "max", type: "uint256" },
				],
				internalType: "struct Price.Props",
				name: "indexTokenPrice",
				type: "tuple",
			},
			{ internalType: "bool", name: "maximize", type: "bool" },
		],
		name: "getNetPnl",
		outputs: [{ internalType: "int256", name: "", type: "int256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "market",
				type: "tuple",
			},
			{
				components: [
					{ internalType: "uint256", name: "min", type: "uint256" },
					{ internalType: "uint256", name: "max", type: "uint256" },
				],
				internalType: "struct Price.Props",
				name: "indexTokenPrice",
				type: "tuple",
			},
			{ internalType: "bool", name: "isLong", type: "bool" },
			{ internalType: "bool", name: "maximize", type: "bool" },
		],
		name: "getOpenInterestWithPnl",
		outputs: [{ internalType: "int256", name: "", type: "int256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "bytes32", name: "key", type: "bytes32" },
		],
		name: "getOrder",
		outputs: [
			{
				components: [
					{
						components: [
							{ internalType: "address", name: "account", type: "address" },
							{ internalType: "address", name: "receiver", type: "address" },
							{
								internalType: "address",
								name: "callbackContract",
								type: "address",
							},
							{
								internalType: "address",
								name: "uiFeeReceiver",
								type: "address",
							},
							{ internalType: "address", name: "market", type: "address" },
							{
								internalType: "address",
								name: "initialCollateralToken",
								type: "address",
							},
							{
								internalType: "address[]",
								name: "swapPath",
								type: "address[]",
							},
						],
						internalType: "struct Order.Addresses",
						name: "addresses",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "enum Order.OrderType",
								name: "orderType",
								type: "uint8",
							},
							{
								internalType: "enum Order.DecreasePositionSwapType",
								name: "decreasePositionSwapType",
								type: "uint8",
							},
							{
								internalType: "uint256",
								name: "sizeDeltaUsd",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "initialCollateralDeltaAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "triggerPrice",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "acceptablePrice",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "executionFee",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "callbackGasLimit",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "minOutputAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "updatedAtBlock",
								type: "uint256",
							},
						],
						internalType: "struct Order.Numbers",
						name: "numbers",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "bool", name: "isLong", type: "bool" },
							{
								internalType: "bool",
								name: "shouldUnwrapNativeToken",
								type: "bool",
							},
							{ internalType: "bool", name: "isFrozen", type: "bool" },
						],
						internalType: "struct Order.Flags",
						name: "flags",
						type: "tuple",
					},
				],
				internalType: "struct Order.Props",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "market",
				type: "tuple",
			},
			{
				components: [
					{ internalType: "uint256", name: "min", type: "uint256" },
					{ internalType: "uint256", name: "max", type: "uint256" },
				],
				internalType: "struct Price.Props",
				name: "indexTokenPrice",
				type: "tuple",
			},
			{ internalType: "bool", name: "isLong", type: "bool" },
			{ internalType: "bool", name: "maximize", type: "bool" },
		],
		name: "getPnl",
		outputs: [{ internalType: "int256", name: "", type: "int256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "address", name: "marketAddress", type: "address" },
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices",
				name: "prices",
				type: "tuple",
			},
			{ internalType: "bool", name: "isLong", type: "bool" },
			{ internalType: "bool", name: "maximize", type: "bool" },
		],
		name: "getPnlToPoolFactor",
		outputs: [{ internalType: "int256", name: "", type: "int256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "bytes32", name: "key", type: "bytes32" },
		],
		name: "getPosition",
		outputs: [
			{
				components: [
					{
						components: [
							{ internalType: "address", name: "account", type: "address" },
							{ internalType: "address", name: "market", type: "address" },
							{
								internalType: "address",
								name: "collateralToken",
								type: "address",
							},
						],
						internalType: "struct Position.Addresses",
						name: "addresses",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "sizeInUsd", type: "uint256" },
							{
								internalType: "uint256",
								name: "sizeInTokens",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "collateralAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "borrowingFactor",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "fundingFeeAmountPerSize",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "longTokenClaimableFundingAmountPerSize",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "shortTokenClaimableFundingAmountPerSize",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "increasedAtBlock",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "decreasedAtBlock",
								type: "uint256",
							},
						],
						internalType: "struct Position.Numbers",
						name: "numbers",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "bool", name: "isLong", type: "bool" },
						],
						internalType: "struct Position.Flags",
						name: "flags",
						type: "tuple",
					},
				],
				internalType: "struct Position.Props",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				internalType: "contract IReferralStorage",
				name: "referralStorage",
				type: "address",
			},
			{ internalType: "bytes32", name: "positionKey", type: "bytes32" },
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices",
				name: "prices",
				type: "tuple",
			},
			{ internalType: "uint256", name: "sizeDeltaUsd", type: "uint256" },
			{ internalType: "address", name: "uiFeeReceiver", type: "address" },
			{
				internalType: "bool",
				name: "usePositionSizeAsSizeDeltaUsd",
				type: "bool",
			},
		],
		name: "getPositionInfo",
		outputs: [
			{
				components: [
					{
						components: [
							{
								components: [
									{ internalType: "address", name: "account", type: "address" },
									{ internalType: "address", name: "market", type: "address" },
									{
										internalType: "address",
										name: "collateralToken",
										type: "address",
									},
								],
								internalType: "struct Position.Addresses",
								name: "addresses",
								type: "tuple",
							},
							{
								components: [
									{
										internalType: "uint256",
										name: "sizeInUsd",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "sizeInTokens",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "collateralAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "borrowingFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "fundingFeeAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "longTokenClaimableFundingAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "shortTokenClaimableFundingAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "increasedAtBlock",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "decreasedAtBlock",
										type: "uint256",
									},
								],
								internalType: "struct Position.Numbers",
								name: "numbers",
								type: "tuple",
							},
							{
								components: [
									{ internalType: "bool", name: "isLong", type: "bool" },
								],
								internalType: "struct Position.Flags",
								name: "flags",
								type: "tuple",
							},
						],
						internalType: "struct Position.Props",
						name: "position",
						type: "tuple",
					},
					{
						components: [
							{
								components: [
									{
										internalType: "bytes32",
										name: "referralCode",
										type: "bytes32",
									},
									{
										internalType: "address",
										name: "affiliate",
										type: "address",
									},
									{ internalType: "address", name: "trader", type: "address" },
									{
										internalType: "uint256",
										name: "totalRebateFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "traderDiscountFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "totalRebateAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "traderDiscountAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "affiliateRewardAmount",
										type: "uint256",
									},
								],
								internalType:
									"struct PositionPricingUtils.PositionReferralFees",
								name: "referral",
								type: "tuple",
							},
							{
								components: [
									{
										internalType: "uint256",
										name: "fundingFeeAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "claimableLongTokenAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "claimableShortTokenAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "latestFundingFeeAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "latestLongTokenClaimableFundingAmountPerSize",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "latestShortTokenClaimableFundingAmountPerSize",
										type: "uint256",
									},
								],
								internalType: "struct PositionPricingUtils.PositionFundingFees",
								name: "funding",
								type: "tuple",
							},
							{
								components: [
									{
										internalType: "uint256",
										name: "borrowingFeeUsd",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "borrowingFeeAmount",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "borrowingFeeReceiverFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "borrowingFeeAmountForFeeReceiver",
										type: "uint256",
									},
								],
								internalType:
									"struct PositionPricingUtils.PositionBorrowingFees",
								name: "borrowing",
								type: "tuple",
							},
							{
								components: [
									{
										internalType: "address",
										name: "uiFeeReceiver",
										type: "address",
									},
									{
										internalType: "uint256",
										name: "uiFeeReceiverFactor",
										type: "uint256",
									},
									{
										internalType: "uint256",
										name: "uiFeeAmount",
										type: "uint256",
									},
								],
								internalType: "struct PositionPricingUtils.PositionUiFees",
								name: "ui",
								type: "tuple",
							},
							{
								components: [
									{ internalType: "uint256", name: "min", type: "uint256" },
									{ internalType: "uint256", name: "max", type: "uint256" },
								],
								internalType: "struct Price.Props",
								name: "collateralTokenPrice",
								type: "tuple",
							},
							{
								internalType: "uint256",
								name: "positionFeeFactor",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "protocolFeeAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "positionFeeReceiverFactor",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "feeReceiverAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "feeAmountForPool",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "positionFeeAmountForPool",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "positionFeeAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "totalCostAmountExcludingFunding",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "totalCostAmount",
								type: "uint256",
							},
						],
						internalType: "struct PositionPricingUtils.PositionFees",
						name: "fees",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "int256",
								name: "priceImpactUsd",
								type: "int256",
							},
							{
								internalType: "uint256",
								name: "priceImpactDiffUsd",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "executionPrice",
								type: "uint256",
							},
						],
						internalType: "struct ReaderPricingUtils.ExecutionPriceResult",
						name: "executionPriceResult",
						type: "tuple",
					},
					{ internalType: "int256", name: "basePnlUsd", type: "int256" },
					{
						internalType: "int256",
						name: "uncappedBasePnlUsd",
						type: "int256",
					},
					{
						internalType: "int256",
						name: "pnlAfterPriceImpactUsd",
						type: "int256",
					},
				],
				internalType: "struct ReaderUtils.PositionInfo",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "market",
				type: "tuple",
			},
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices",
				name: "prices",
				type: "tuple",
			},
			{ internalType: "bytes32", name: "positionKey", type: "bytes32" },
			{ internalType: "uint256", name: "sizeDeltaUsd", type: "uint256" },
		],
		name: "getPositionPnlUsd",
		outputs: [
			{ internalType: "int256", name: "", type: "int256" },
			{ internalType: "int256", name: "", type: "int256" },
			{ internalType: "uint256", name: "", type: "uint256" },
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "market",
				type: "tuple",
			},
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices",
				name: "prices",
				type: "tuple",
			},
			{ internalType: "address", name: "tokenIn", type: "address" },
			{ internalType: "uint256", name: "amountIn", type: "uint256" },
			{ internalType: "address", name: "uiFeeReceiver", type: "address" },
		],
		name: "getSwapAmountOut",
		outputs: [
			{ internalType: "uint256", name: "", type: "uint256" },
			{ internalType: "int256", name: "", type: "int256" },
			{
				components: [
					{
						internalType: "uint256",
						name: "feeReceiverAmount",
						type: "uint256",
					},
					{
						internalType: "uint256",
						name: "feeAmountForPool",
						type: "uint256",
					},
					{ internalType: "uint256", name: "amountAfterFees", type: "uint256" },
					{ internalType: "address", name: "uiFeeReceiver", type: "address" },
					{
						internalType: "uint256",
						name: "uiFeeReceiverFactor",
						type: "uint256",
					},
					{ internalType: "uint256", name: "uiFeeAmount", type: "uint256" },
				],
				internalType: "struct SwapPricingUtils.SwapFees",
				name: "fees",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "address", name: "marketKey", type: "address" },
			{ internalType: "address", name: "tokenIn", type: "address" },
			{ internalType: "address", name: "tokenOut", type: "address" },
			{ internalType: "uint256", name: "amountIn", type: "uint256" },
			{
				components: [
					{ internalType: "uint256", name: "min", type: "uint256" },
					{ internalType: "uint256", name: "max", type: "uint256" },
				],
				internalType: "struct Price.Props",
				name: "tokenInPrice",
				type: "tuple",
			},
			{
				components: [
					{ internalType: "uint256", name: "min", type: "uint256" },
					{ internalType: "uint256", name: "max", type: "uint256" },
				],
				internalType: "struct Price.Props",
				name: "tokenOutPrice",
				type: "tuple",
			},
		],
		name: "getSwapPriceImpact",
		outputs: [
			{ internalType: "int256", name: "", type: "int256" },
			{ internalType: "int256", name: "", type: "int256" },
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{ internalType: "bytes32", name: "key", type: "bytes32" },
		],
		name: "getWithdrawal",
		outputs: [
			{
				components: [
					{
						components: [
							{ internalType: "address", name: "account", type: "address" },
							{ internalType: "address", name: "receiver", type: "address" },
							{
								internalType: "address",
								name: "callbackContract",
								type: "address",
							},
							{
								internalType: "address",
								name: "uiFeeReceiver",
								type: "address",
							},
							{ internalType: "address", name: "market", type: "address" },
							{
								internalType: "address[]",
								name: "longTokenSwapPath",
								type: "address[]",
							},
							{
								internalType: "address[]",
								name: "shortTokenSwapPath",
								type: "address[]",
							},
						],
						internalType: "struct Withdrawal.Addresses",
						name: "addresses",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "uint256",
								name: "marketTokenAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "minLongTokenAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "minShortTokenAmount",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "updatedAtBlock",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "executionFee",
								type: "uint256",
							},
							{
								internalType: "uint256",
								name: "callbackGasLimit",
								type: "uint256",
							},
						],
						internalType: "struct Withdrawal.Numbers",
						name: "numbers",
						type: "tuple",
					},
					{
						components: [
							{
								internalType: "bool",
								name: "shouldUnwrapNativeToken",
								type: "bool",
							},
						],
						internalType: "struct Withdrawal.Flags",
						name: "flags",
						type: "tuple",
					},
				],
				internalType: "struct Withdrawal.Props",
				name: "",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{
				internalType: "contract DataStore",
				name: "dataStore",
				type: "address",
			},
			{
				components: [
					{ internalType: "address", name: "marketToken", type: "address" },
					{ internalType: "address", name: "indexToken", type: "address" },
					{ internalType: "address", name: "longToken", type: "address" },
					{ internalType: "address", name: "shortToken", type: "address" },
				],
				internalType: "struct Market.Props",
				name: "market",
				type: "tuple",
			},
			{
				components: [
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "indexTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "longTokenPrice",
						type: "tuple",
					},
					{
						components: [
							{ internalType: "uint256", name: "min", type: "uint256" },
							{ internalType: "uint256", name: "max", type: "uint256" },
						],
						internalType: "struct Price.Props",
						name: "shortTokenPrice",
						type: "tuple",
					},
				],
				internalType: "struct MarketUtils.MarketPrices",
				name: "prices",
				type: "tuple",
			},
			{ internalType: "uint256", name: "marketTokenAmount", type: "uint256" },
			{ internalType: "address", name: "uiFeeReceiver", type: "address" },
		],
		name: "getWithdrawalAmountOut",
		outputs: [
			{ internalType: "uint256", name: "", type: "uint256" },
			{ internalType: "uint256", name: "", type: "uint256" },
		],
		stateMutability: "view",
		type: "function",
	},
] as const;
