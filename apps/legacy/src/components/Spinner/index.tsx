import classnames from 'classnames';
import { FC } from 'react';
import styles from './style.module.scss';

interface SpinerProps {
  className?: string | string[];
  small?: boolean;
}

export const Spinner: FC<SpinerProps> = ({ className, small }) => {
  return <div className={classnames(styles.spinner, className, { [styles.small]: small })} />
}

export default Spinner;