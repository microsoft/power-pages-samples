import React from "react";
import { carouselContainerStyle, carouselItemStyle } from "../utils/AppStyleUtils";
import { EmblaCarouselReact, useEmblaCarousel } from "embla-carousel-react";

interface Offer {
  id: string;
  title: string;
  description: string;
  validity: string;
}

interface LatestOffersCarouselProps {
  offers: Offer[];
}

const LatestOffersCarousel: React.FC<LatestOffersCarouselProps> = ({ offers }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  return (
    <div className={ carouselContainerStyle }>
      <div ref={ emblaRef } className="embla">
        <div className="embla__container flex">
          { offers.map((offer) => (<div key={ offer.id } className={ `embla__slide ${carouselItemStyle} dark:bg-gray-800 dark:text-gray-200` }>
            <h3 className="text-lg font-bold mb-2 dark:text-gray-100">{ offer.title }</h3>
            <p className="text-sm mb-2 dark:text-gray-300">{ offer.description }</p>
            <span className="text-xs font-semibold dark:text-gray-400">Valid until: { offer.validity }</span>
          </div>
          )) }
        </div>
      </div>      <button
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-700 dark:text-gray-200 rounded-full p-2 shadow-lg"
        onClick={ () => emblaApi?.scrollPrev() }
      >
        ❮
      </button>
      <button
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-700 dark:text-gray-200 rounded-full p-2 shadow-lg"
        onClick={ () => emblaApi?.scrollNext() }
      >
        ❯
      </button>
    </div>
  );
};

export default LatestOffersCarousel;