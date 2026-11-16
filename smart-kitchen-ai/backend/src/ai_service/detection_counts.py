"""Loại khung trùng cùng tên tiếng Việt trước khi đếm, giữ các vật thể riêng biệt."""
def intersection_over_union(first, second):
    left, top = max(first[0], second[0]), max(first[1], second[1])
    right, bottom = min(first[2], second[2]), min(first[3], second[3])
    intersection = max(0, right - left) * max(0, bottom - top)
    first_area = max(0, first[2] - first[0]) * max(0, first[3] - first[1])
    second_area = max(0, second[2] - second[0]) * max(0, second[3] - second[1])
    union = first_area + second_area - intersection
    return intersection / union if union else 0


def deduplicate_detections(detections, threshold=0.65):
    # NMS mặc định của model không gộp các class alias như onion/Cebolla.
    kept = []
    for item in sorted(detections, key=lambda detection: detection['confidence'], reverse=True):
        if any(item['name'] == other['name'] and
               intersection_over_union(item['box'], other['box']) >= threshold
               for other in kept):
            continue
        kept.append(item)
    return kept
