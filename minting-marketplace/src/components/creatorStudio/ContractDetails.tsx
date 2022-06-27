import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import chainData from '../../utils/blockchainData'
import InputField from '../common/InputField';
import { rFetch } from '../../utils/rFetch';
import { metamaskCall } from '../../utils/metamaskUtils';
import Swal from 'sweetalert2';
import { useParams, useHistory } from 'react-router-dom';
import { erc721Abi, diamondFactoryAbi } from '../../contracts';
import FixedBottomNavigation from './FixedBottomNavigation';
import NavigatorContract from './NavigatorContract';
import { RootState } from '../../ducks';
import { ColorStoreType } from '../../ducks/colors/colorStore.types';
import { ContractsInitialType } from '../../ducks/contracts/contracts.types';
import { TContractsNetworkContract, TContractsNetworkProductsResponse, TContractsNetworkResponseType, TParamsContractDetails, TSetData } from './creatorStudio.types';

const ContractDetails = () => {

	const [collectionName, setCollectionName] = useState<string>('');
	const [isDiamond, setIsDiamond] = useState<boolean>(false);
	const [collectionLength, setCollectionLength] = useState<number>(0);

	const [creatingCollection, setCreatingCollection] = useState<boolean>(false);

	const { primaryColor, secondaryColor } = useSelector<RootState, ColorStoreType>(store => store.colorStore);
	const { contractCreator, currentChain } = useSelector<RootState, ContractsInitialType>(store => store.contractStore);
	const { address, blockchain }: TParamsContractDetails = useParams();

	const [data, setData] = useState<TContractsNetworkContract | TSetData>();

	const history = useHistory();

	const getContractData = useCallback(async () => {
		if (!address) {
			return
		}
		let dataRequest: TContractsNetworkResponseType = await rFetch(`/api/contracts/network/${blockchain}/${address}`);
		let productsRequest: TContractsNetworkProductsResponse = await rFetch(`/api/contracts/network/${blockchain}/${address}/products`);
		if (dataRequest.success) {
			if (productsRequest.success) {
				dataRequest.contract.products = productsRequest.products;
			}
			setData(dataRequest.contract);
			setIsDiamond(dataRequest.contract.diamond);
		} else {
			// Try diamonds
			let instance = contractCreator?.(address, diamondFactoryAbi);
			let productCount = Number((await instance?.getProductCount()).toString());
			setIsDiamond(true);
			setData({
				title: await instance?.name(),
				contractAddress: address,
				blockchain: currentChain,
				products: Array(productCount)
			});
		}
	}, [address, blockchain, contractCreator, currentChain])

	useEffect(() => {
		getContractData();
	}, [getContractData])

	let onMyChain = data?.blockchain && (window.ethereum ?
		chainData[data?.blockchain]?.chainId === currentChain
		: 
		chainData[data?.blockchain]?.chainId === currentChain);

	return <div className='row px-0 mx-0'>
		{data ? <NavigatorContract contractName={data.title} contractAddress={data.contractAddress} contractBlockchain={data.blockchain} >
			<div className='col-8 p-2'>
				<InputField
					disabled={creatingCollection}
					getter={collectionName}
					setter={setCollectionName}
					placeholder='Name your collection'
					label="New Collection name"
					customClass='rounded-rair form-control'
					customCSS={{backgroundColor: `var(--${primaryColor})`, color: 'inherit', borderColor: `var(--${secondaryColor}-40)`}}
					labelClass='text-start w-100'
					/>
			</div>
			<div className='col-4 p-2'>
				<InputField
					disabled={creatingCollection}
					getter={collectionLength}
					setter={setCollectionLength}
					placeholder='Length'
					label="Length"
					type='number'
					min={0}
					customClass='rounded-rair form-control'
					customCSS={{backgroundColor: `var(--${primaryColor})`, color: 'inherit', borderColor: `var(--${secondaryColor}-40)`}}
					labelClass='text-start w-100'
					/>
			</div>
			<div className='col-12 p-3 mt-5 rounded-rair' style={{border: '1.3px dashed var(--charcoal-80)'}}>
				Contract Information: <br />
				<ul className='col-12 mt-3 px-4 text-start'>
					<li className='row'>
						<span className='col-12 py-1 text-start'>
							Total Supply: <b>0</b>
						</span>
						<span className='col-12 py-1 text-start'>
							Collections Created: <b>{data?.products?.length ? data?.products?.length : 0}</b>
						</span>
						<span className='col-12 py-1 text-start'>
							Current Balance: <b>0</b>
						</span>
					</li>
				</ul>
			</div>
		</NavigatorContract> : 'Fetching data...'}
		<FixedBottomNavigation
			backwardFunction={() => {
				history.goBack()
			}}
			forwardFunctions={[{
				action: collectionLength > 0 && collectionName !== '' ? async () => {
					if (!onMyChain) {
						if (window.ethereum) {
							await window.ethereum.request({
								method: 'wallet_switchEthereumChain',
								params: [{ chainId: data?.blockchain && chainData[data.blockchain]?.chainId }],
							});
						} else {
							// Code for suresh goes here
						}
					} else {
						Swal.fire({
							title: 'Creating collection!',
							html: 'Please wait...',
							icon: 'info',
							showConfirmButton: false
						});
						setCreatingCollection(true);
						let instance = await contractCreator?.(data?.contractAddress, isDiamond ? diamondFactoryAbi : erc721Abi);
						let success = await metamaskCall(instance?.createProduct(collectionName, collectionLength));
						if (success) {
							Swal.fire({
								title: 'Success!',
								html: 'Collection created',
								icon: 'success',
								showConfirmButton: true
							});
							setCollectionName('');
							setCollectionLength(0);
						}
						setCreatingCollection(false);
					}
				} : undefined,
				label: (data && data.blockchain && !onMyChain) ? `Switch to ${chainData[data.blockchain]?.name}` : 'Create collection!',
				disabled: creatingCollection || collectionLength === 0 || collectionName === ''
			}]}
		/>
	</div>
}

export default ContractDetails;