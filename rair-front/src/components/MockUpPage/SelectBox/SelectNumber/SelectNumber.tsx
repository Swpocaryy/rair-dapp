import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppSelector } from '../../../../hooks/useReduxHooks';
import { ISelectNumber } from '../selectBox.types';

import { CurrentTokens } from './CurrentTokens/CurrentTokens';
import { ListOfTokens } from './ListOfTokens/ListOfTokens';

import './SelectNumber.css';

const SelectNumber: React.FC<ISelectNumber> = ({
  blockchain,
  items,
  handleClickToken,
  selectedToken,
  setSelectedToken,
  product,
  contract,
  serialNumberData
}) => {
  const { currentCollectionTotal } = useAppSelector((store) => store.tokens);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const numberRef = useRef<HTMLDivElement>(null);

  const handleClickOutSideNumberItem = useCallback(
    (e: MouseEvent) => {
      if (!numberRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    },
    [numberRef, setIsOpen]
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutSideNumberItem);
    return () =>
      document.removeEventListener('mousedown', handleClickOutSideNumberItem);
  }, [handleClickOutSideNumberItem]);

  const handleIsOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const onClickItem = (el: string | undefined) => {
    setSelectedToken(el);
    handleClickToken(el);
    handleIsOpen();
  };

  return currentCollectionTotal < 100 ? (
    <CurrentTokens
      items={items}
      isOpen={isOpen}
      selectedToken={selectedToken}
      setIsOpen={setIsOpen}
      numberRef={numberRef}
      handleIsOpen={handleIsOpen}
      onClickItem={onClickItem}
    />
  ) : (
    <ListOfTokens
      blockchain={blockchain}
      contract={contract}
      isOpen={isOpen}
      handleIsOpen={handleIsOpen}
      numberRef={numberRef}
      onClickItem={onClickItem}
      product={product}
      serialNumberData={serialNumberData}
      setSelectedToken={setSelectedToken}
      selectedToken={selectedToken}
      setIsOpen={setIsOpen}
    />
  );
};

export default SelectNumber;
