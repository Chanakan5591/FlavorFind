import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

type Props = {
  averageRating: number; // Average rating for the store
  userRating: number; // Initial user rating
  storeId: string; // Store identifier
  onRatingChange: (newRating: number) => void; // Callback when user's rating changes
};

export default function ReviewStars({
  averageRating,
  userRating,
  storeId,
  onRatingChange,
}: Props) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedUserRating, setSelectedUserRating] = useState<number>(userRating);

  useEffect(() => {
    setSelectedUserRating(userRating);
  }, [userRating]); 

  const currentUserRating = hoveredRating !== null ? hoveredRating : selectedUserRating;

  const { fullStars: avgFull, halfStars: avgHalf } = getStarRating(averageRating);
  const { fullStars: userFull, halfStars: userHalf, emptyStars: userEmpty } =
    getStarRating(currentUserRating);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>, index: number) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoveredRating(index + (isHalf ? 0.5 : 1));
  };

  const handleMouseLeave = () => setHoveredRating(null);

  const handleClick = (rating: number) => {
    setSelectedUserRating(rating);
    onRatingChange(rating);
  };

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        width: "fit-content",
      }}
    >
      {/* Average Rating Layer */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          zIndex: 1,
          pointerEvents: "none",
          color: "#ddd", // Light gray for average stars
        }}
      >
        {[...Array(5)].map((_, index) => {
          const starIndex = index + 1;
          const isFull = starIndex <= avgFull;
          const isHalf = !isFull && starIndex <= avgFull + avgHalf;
          return (
            <i
              key={`avg-${index}`}
              className={
                isFull
                  ? "ri-star-fill avg-star"
                  : isHalf
                  ? "ri-star-half-line avg-star"
                  : "ri-star-line avg-star"
              }
            ></i>
          );
        })}
      </div>

      {/* User Interaction Layer */}
      <div
        style={{
          position: "relative",
          display: "flex",
          zIndex: 2,
        }}
        onMouseLeave={handleMouseLeave}
      >
        {[...Array(5)].map((_, index) => {
          const starIndex = index + 1;
          const isFull = starIndex <= userFull;
          const isHalf = !isFull && starIndex <= userFull + userHalf;
          return (
            <i
              key={`user-${index}`}
              className={
                isFull
                  ? "ri-star-fill user-star"
                  : isHalf
                  ? "ri-star-half-line user-star"
                  : "ri-star-line user-star"
              }
              style={{ cursor: "pointer" }}
              onMouseMove={(event) => handleMouseMove(event, index)}
              onClick={() => handleClick(starIndex - (isHalf ? 0.5 : 0))}
            ></i>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to calculate the star distribution
function getStarRating(rating: number) {
  const fullStars = Math.floor(rating);
  const halfStars = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStars;
  return { fullStars, halfStars, emptyStars };
}
