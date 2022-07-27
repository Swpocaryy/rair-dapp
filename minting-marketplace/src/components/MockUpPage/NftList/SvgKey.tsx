//@ts-nocheck
import React from 'react';
export type TSvgKeyProps = {
  color: string;
  bgColor: string;
  mobile?: boolean;
};
export const SvgKey = ({ color, bgColor, mobile }: TSvgKeyProps) => (
  <div
    style={{
      width: mobile ? '24px' : '32px',
      height: mobile ? '24px' : '32px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      top: mobile ? '8px' : '24px',
      right: mobile ? '8px' : '24px',
      background: bgColor,
      borderRadius: mobile ? '8px' : '12px'
    }}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15.5556 5.55556C15.1171 5.54431 14.6997 5.3651 14.3895 5.05495C14.0793 4.74479 13.9001 4.32737 13.8889 3.88889C13.8889 3.44686 14.0645 3.02294 14.377 2.71038C14.6896 2.39782 15.1135 2.22222 15.5556 2.22222C15.9976 2.22222 16.4215 2.39782 16.7341 2.71038C17.0466 3.02294 17.2222 3.44686 17.2222 3.88889C17.211 4.32737 17.0318 4.74479 16.7216 5.05495C16.4115 5.3651 15.994 5.54431 15.5556 5.55556ZM13.8889 0C12.2726 0.0144967 10.7266 0.662998 9.5837 1.80593C8.44078 2.94886 7.79227 4.49483 7.77778 6.11111C7.81178 7.19181 8.07699 8.25267 8.55556 9.22222L0 17.7778V20H4.44444V17.7778H6.66667V15.5556H8.88889L12.4444 12C12.916 12.1281 13.4006 12.2027 13.8889 12.2222C15.5052 12.2077 17.0511 11.5592 18.1941 10.4163C19.337 9.27337 19.9855 7.72739 20 6.11111C19.9855 4.49483 19.337 2.94886 18.1941 1.80593C17.0511 0.662998 15.5052 0.0144967 13.8889 0Z"
        fill={color}
      />
    </svg>
  </div>
);
