import unittest
from src.ai_service.detection_counts import deduplicate_detections


def detection(name, box, confidence=0.9):
    return dict(name=name, box=box, confidence=confidence)


class DetectionCountsTest(unittest.TestCase):
    def test_alias_boxes_count_once_and_keep_highest_confidence(self):
        rows = [detection('Hành tây', [0, 0, 100, 100], 0.7),
                detection('Hành tây', [2, 2, 99, 99], 0.95)]
        result = deduplicate_detections(rows)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['confidence'], 0.95)

    def test_separate_objects_remain_separate(self):
        rows = [detection('Cam', [0, 0, 50, 50]), detection('Cam', [45, 0, 100, 50])]
        self.assertEqual(len(deduplicate_detections(rows)), 2)

    def test_different_foods_not_merged(self):
        rows = [detection('Táo', [0, 0, 100, 100]), detection('Cam', [0, 0, 100, 100])]
        self.assertEqual(len(deduplicate_detections(rows)), 2)

    def test_empty_result(self):
        self.assertEqual(deduplicate_detections([]), [])
