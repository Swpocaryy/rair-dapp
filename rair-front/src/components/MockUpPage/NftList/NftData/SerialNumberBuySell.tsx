import React, { useCallback, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { useParams } from 'react-router';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { formatEther, isAddress, ZeroAddress } from 'ethers';
import { Hex } from 'viem';

import { BuySellButton } from './BuySellButton';
import SellInputButton from './SellInputButton';

import { TUserResponse } from '../../../../axios.responseTypes';
import useContracts from '../../../../hooks/useContracts';
import { useAppSelector } from '../../../../hooks/useReduxHooks';
import useServerSettings from '../../../../hooks/useServerSettings';
import useSwal from '../../../../hooks/useSwal';
import useWeb3Tx from '../../../../hooks/useWeb3Tx';
import { BillTransferIcon, GrandpaWait } from '../../../../images';
import { store } from '../../../../redux/store';
import { User } from '../../../../types/databaseTypes';
import { rFetch } from '../../../../utils/rFetch';
import { ContractType } from '../../../adminViews/adminView.types';
import ResaleModal from '../../../nft/PersonalProfile/PersonalProfileMyNftTab/ResaleModal/ResaleModal';
import defaultImage from '../../../UserProfileSettings/images/defaultUserPictures.png';
import { ImageLazy } from '../../ImageLazy/ImageLazy';
import { ISerialNumberBuySell } from '../../mockupPage.types';
import SelectNumber from '../../SelectBox/SelectNumber/SelectNumber';
import { currentTokenData } from '../utils/currentTokenData';

const SerialNumberBuySell: React.FC<ISerialNumberBuySell> = ({
  tokenData,
  handleClickToken,
  blockchain,
  product,
  contract,
  selectedToken,
  setSelectedToken,
  offerData,
  handleTokenBoughtButton,
  tokenDataForResale,
  serialNumberData
}) => {
  const { diamondMarketplaceInstance } = useContracts();
  const { currentUserAddress, exchangeRates } = useAppSelector(
    (state) => state.web3
  );
  const { primaryColor, textColor } = useAppSelector((store) => store.colors);
  const { databaseResales } = useAppSelector((store) => store.settings);

  const reactSwal = useSwal();
  const { web3TxHandler, correctBlockchain, web3Switch } = useWeb3Tx();

  const numberTooBigThreshold = BigInt(10000000000);

  const [accountData, setAccountData] = useState<User | null>(null);
  const [contractData, setContractData] = useState<ContractType>();
  const [resaleData, setResaleData] = useState<any>();
  const params = useParams();

  const getInfoFromUser = useCallback(async () => {
    // find user
    if (
      params.tokenId &&
      tokenData &&
      Object.values(tokenData)[0]?.ownerAddress &&
      isAddress(Object.values(tokenData)[0]?.ownerAddress) &&
      Object.values(tokenData)[0]?.ownerAddress !== ZeroAddress
    ) {
      try {
        const result = await axios
          .get<TUserResponse>(
            `/api/users/${Object.values(tokenData)[0]?.ownerAddress}`
          )
          .then((res) => res.data);
        if (result.success) {
          setAccountData(result.user);
        }
      } catch (e) {
        setAccountData(null);
      }
    }
  }, [params.tokenId, setAccountData, tokenData]);

  const buyContract = useCallback(async () => {
    if (!contractData || !offerData) {
      return;
    }
    if (!contractData.diamond) {
      return;
    }
    if (!diamondMarketplaceInstance) {
      return;
    }
    const marketplaceContract = diamondMarketplaceInstance;
    const marketplaceMethod = 'buyMintingOffer';
    const marketplaceArguments: any[] = [
      offerData.offerIndex, // Offer Index
      selectedToken // Token Index
    ];
    marketplaceArguments.push({
      value: offerData.price
    });
    reactSwal.fire({
      title: 'Buying token',
      html: (
        <>
          Awaiting transaction completion
          <div className="wait-minting-token">
            <img src={`${GrandpaWait}`} alt="waiting minting token" />
          </div>
        </>
      ),
      icon: 'info',
      showConfirmButton: false
    });
    if (
      await web3TxHandler(
        marketplaceContract,
        marketplaceMethod,
        marketplaceArguments,
        {
          intendedBlockchain: blockchain as Hex,
          failureMessage:
            'Sorry your transaction failed! When several people try to buy at once - only one transaction can get to the blockchain first. Please try again!',
          callback: handleTokenBoughtButton,
          sponsored: offerData.sponsored
        }
      )
    ) {
      reactSwal.fire(
        'Success',
        'Now, you are the owner of this token',
        'success'
      );
      handleTokenBoughtButton();
    }
  }, [
    contractData,
    offerData,
    reactSwal,
    web3TxHandler,
    blockchain,
    handleTokenBoughtButton,
    diamondMarketplaceInstance,
    selectedToken
  ]);

  const { getBlockchainData } = useServerSettings();

  useEffect(() => {
    if (offerData) {
      (async () => {
        const contractInfo = await rFetch(
          `/api/contracts/${offerData.contract}`
        );
        setContractData(contractInfo?.contract);
      })();
    }
  }, [offerData]);

  const getResaleData = useCallback(async () => {
    if (
      !diamondMarketplaceInstance ||
      !selectedToken ||
      (tokenData && !Object.values(tokenData)[0].uniqueIndexInContract)
    ) {
      return;
    }
    const contractResponse = await rFetch(
      `/api/contracts?contractAddress=${params.contract}&blockchain=${params.blockchain}`
    );
    if (!contractResponse.success) {
      return;
    }
    const contractData = contractResponse?.result?.at(0);
    if (!contractData) {
      return;
    }
    setResaleData(undefined);
    const resaleResponse = await rFetch(
      `/api/resales/open?contract=${params.contract}&blockchain=${
        params.blockchain
      }&index=${tokenData && Object.values(tokenData)[0].uniqueIndexInContract}`
    );
    if (!resaleResponse.success) {
      return;
    }
    const fetchedResaleData = resaleResponse?.data?.[0];
    if (!fetchedResaleData) {
      return;
    }
    const userResponse = await rFetch(
      `/api/users/${fetchedResaleData.seller.toLowerCase()}`
    );
    if (userResponse.success) {
      fetchedResaleData.seller = userResponse.user.nickName;
    }
    setResaleData(fetchedResaleData);
  }, [
    diamondMarketplaceInstance,
    params.contract,
    params.blockchain,
    tokenData,
    selectedToken
  ]);

  useEffect(() => {
    getResaleData();
  }, [getResaleData]);

  useEffect(() => {
    getInfoFromUser();
  }, [getInfoFromUser]);

  const resalePurchase = useCallback(async () => {
    if (!correctBlockchain(blockchain)) {
      web3Switch(blockchain);
      return;
    }
    if (!diamondMarketplaceInstance || !tokenData || !params?.tokenId) {
      return;
    }
    /*
    const royalties = await diamondMarketplaceInstance.getRoyalties(
      params.contract
    );
    if (royalties) {
      const readableRoyalties = royalties.map((royalty) => ({
        address: royalty.recipient,
        percentage: formatUnits(royalty.percentage, 3)
      }));
      // Here is the array of royalties
      // console.info(readableRoyalties);
    }
    */
    const { isConfirmed } = await reactSwal.fire({
      imageUrl: Object.values(tokenData)[0].metadata.image,
      imageHeight: '25vh',
      title: 'Purchase token',
      html: <>Currently owned by: {resaleData.seller}</>,
      showCancelButton: true
    });
    if (!isConfirmed || !selectedToken) {
      return;
    }
    reactSwal.fire({
      title: 'Please wait',
      html: 'Preparing transaction',
      icon: 'info',
      showConfirmButton: false
    });
    if (databaseResales) {
      const { success, hash } = await rFetch(
        `/api/resales/purchase/${resaleData._id}`
      );
      if (
        success &&
        (await web3TxHandler(
          diamondMarketplaceInstance,
          'purchaseTokenOffer',
          [
            params.contract, // address erc721,
            currentUserAddress, // address buyer,
            Object.values(tokenData)[0]?.ownerAddress, // address seller,
            resaleData.tokenIndex, // uint token,
            resaleData.price, // uint tokenPrice,
            import.meta.env.VITE_NODE_ADDRESS, // address nodeAddress,
            hash, // bytes memory signature
            { value: resaleData.price }
          ],
          {
            callback: () => {
              getResaleData();
              handleTokenBoughtButton();
            },
            intendedBlockchain: blockchain
          }
        ))
      ) {
        reactSwal.fire('Success', 'Token purchased', 'success');
      }
    } else if (
      resaleData.blockchainOfferId !== undefined &&
      (await web3TxHandler(
        diamondMarketplaceInstance,
        'purchaseGasTokenOffer',
        [resaleData.blockchainOfferId, { value: resaleData.price }]
      ))
    ) {
      reactSwal.fire('Success', 'Token purchased', 'success');
    }
  }, [
    web3Switch,
    diamondMarketplaceInstance,
    reactSwal,
    resaleData,
    web3TxHandler,
    handleTokenBoughtButton,
    blockchain,
    params,
    currentUserAddress,
    selectedToken,
    tokenData,
    getResaleData,
    correctBlockchain,
    databaseResales
  ]);

  const checkAllSteps = useCallback(() => {
    if (!blockchain) {
      return <></>;
    }

    if (!currentUserAddress) {
      if (
        selectedToken &&
        tokenData &&
        Object.values(tokenData)[0]?.isMinted === true
      ) {
        return (
          <div className="container-sell-button-user">
            Owned by{' '}
            <div className="block-user-creator">
              <ImageLazy
                src={accountData?.avatar ? accountData.avatar : defaultImage}
                alt="User Avatar"
              />
              {selectedToken && (
                <NavLink to={`/${Object.values(tokenData)[0]?.ownerAddress}`}>
                  <h5>
                    {(accountData &&
                    accountData.nickName &&
                    accountData.nickName.length > 20
                      ? accountData.nickName.slice(0, 5) +
                        '....' +
                        accountData.nickName.slice(length - 4)
                      : accountData && accountData.nickName) ||
                      (Object.values(tokenData)[0]?.ownerAddress &&
                        Object.values(tokenData)[0]?.ownerAddress.slice(0, 4) +
                          '....' +
                          Object.values(tokenData)[0]?.ownerAddress.slice(
                            length - 4
                          ))}
                  </h5>
                </NavLink>
              )}
            </div>
          </div>
        );
      }

      if (!correctBlockchain(blockchain)) {
        return (
          <BuySellButton
            // handleClick={() => web3Switch(blockchain)}
            isColorPurple={true}
            title={`Log in to buy`}
            disabled={true}
          />
        );
      }
    }

    // Blockchain is not correct
    if (currentUserAddress && !correctBlockchain(blockchain)) {
      return (
        <BuySellButton
          handleClick={() => {
            console.info(blockchain);
            web3Switch(blockchain);
          }}
          isColorPurple={true}
          title={`Switch network`}
        />
      );
    }

    // Blockchain is correct and offer exists
    if (tokenData && !Object.values(tokenData)[0]?.isMinted && offerData) {
      const rawPrice = BigInt(offerData?.price ? offerData?.price : 0);
      const price =
        numberTooBigThreshold >= rawPrice ? '0.000+' : formatEther(rawPrice);

      const priceForUSD = formatEther(rawPrice);

      if (
        !contractData ||
        !offerData?.offerIndex ||
        (contractData.diamond
          ? !offerData.diamondRangeIndex
          : !offerData.offerPool)
      ) {
        return <></>;
      }

      return (
        <>
          <BuySellButton
            handleClick={buyContract}
            isColorPurple={true}
            title={`Buy ${price} ${
              blockchain && getBlockchainData(blockchain)?.symbol
            }`}
          />
          {exchangeRates && (
            <div className="text-sell-button-usd-price">
              $
              {(
                Number(priceForUSD) * Number(exchangeRates[blockchain])
              ).toFixed(2)}
            </div>
          )}
        </>
      );
      // Token is minted
    } else if (tokenData && Object.values(tokenData)[0]?.isMinted) {
      if (resaleData) {
        const price =
          numberTooBigThreshold >= resaleData.price
            ? '0.000+'
            : formatEther(resaleData.price);
        const priceForUSD = formatEther(resaleData.price);

        return (
          <>
            <BuySellButton
              disabled={resaleData.seller === currentUserAddress}
              isColorPurple={false}
              handleClick={resalePurchase}
              title={`Buy ${price} ${getBlockchainData(blockchain)?.symbol}`}
            />
            <small>Resale offer</small>
            {exchangeRates && (
              <div className="text-sell-button-usd-price">
                $
                {(
                  Number(priceForUSD) * Number(exchangeRates[blockchain])
                ).toFixed(2)}
              </div>
            )}
          </>
        );
      }
      // Current user is owner of the token
      if (
        Object.values(tokenData)[0].ownerAddress ===
        currentUserAddress?.toLowerCase()
      ) {
        return (
          <SellInputButton
            tokenData={tokenData}
            selectedToken={selectedToken}
            refreshResaleData={getResaleData}
          />
        );
        // User is not owner and resale data exists
      } else {
        return (
          <div className="container-sell-button-user">
            Owned by{' '}
            <div className="block-user-creator">
              <ImageLazy
                src={accountData?.avatar ? accountData.avatar : defaultImage}
                alt="User Avatar"
              />
              {Object.values(tokenData)[0] && (
                <NavLink to={`/${Object.values(tokenData)[0]?.ownerAddress}`}>
                  <h5>
                    {(accountData &&
                    accountData.nickName &&
                    accountData.nickName.length > 20
                      ? accountData.nickName.slice(0, 5) +
                        '....' +
                        accountData.nickName.slice(length - 4)
                      : accountData && accountData.nickName) ||
                      (Object.values(tokenData)[0]?.ownerAddress &&
                        Object.values(tokenData)[0]?.ownerAddress.slice(0, 4) +
                          '....' +
                          Object.values(tokenData)[0]?.ownerAddress.slice(
                            length - 4
                          ))}
                  </h5>
                </NavLink>
              )}
            </div>
          </div>
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    blockchain,
    correctBlockchain,
    selectedToken,
    tokenData,
    offerData,
    web3Switch,
    numberTooBigThreshold,
    contractData,
    buyContract,
    currentUserAddress,
    resaleData,
    resalePurchase,
    accountData,
    getResaleData
  ]);

  return (
    <div className="main-tab">
      <div className="main-tab-description-serial-number">
        <div
          className="description-text serial-number-text"
          style={{
            color: `${primaryColor === 'rhyno' ? '#7A797A' : '#A7A6A6'}`
          }}>
          Serial number
        </div>
        <div>
          {tokenData && Object.keys(tokenData)?.length ? (
            <SelectNumber
              blockchain={blockchain}
              product={product}
              contract={contract}
              serialNumberData={serialNumberData}
              handleClickToken={handleClickToken}
              selectedToken={selectedToken}
              setSelectedToken={setSelectedToken}
              items={currentTokenData(tokenData)}
            />
          ) : (
            <></>
          )}
        </div>
      </div>
      {tokenData &&
        selectedToken &&
        tokenDataForResale &&
        Object.values(tokenData)[0]?.isMinted &&
        currentUserAddress === Object.values(tokenData)[0].ownerAddress && (
          <button
            onClick={() => {
              reactSwal.fire({
                html: (
                  <Provider store={store}>
                    <ResaleModal
                      textColor={textColor}
                      singleTokenPage={true}
                      item={tokenDataForResale}
                      reloadFunction={handleTokenBoughtButton}
                    />
                  </Provider>
                ),
                showConfirmButton: false,
                showCloseButton: true,
                customClass: `resale-pop-up-custom ${
                  primaryColor === 'rhyno' ? 'rhyno' : ''
                }`
              });
            }}
            className="nft-item-sell-buton">
            <BillTransferIcon primaryColor={primaryColor} />
          </button>
        )}
      <div>{checkAllSteps()}</div>
    </div>
  );
};

export default SerialNumberBuySell;
