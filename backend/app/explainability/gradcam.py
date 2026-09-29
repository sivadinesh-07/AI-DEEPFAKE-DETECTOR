"""
Grad-CAM (Gradient-weighted Class Activation Mapping) for EfficientNet-B4.
Highlights manipulated facial regions (eyes, mouth boundary, blending seams) for forensic explainability.
"""

import os
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from typing import Tuple, Dict, Optional
class GradCAM:
    def __init__(self, model: torch.nn.Module, target_layer: Optional[torch.nn.Module] = None):
        self.model = model
        # Target innermost conv2d of the last conv stage of EfficientNet-B4
        if target_layer is None:
            if hasattr(model.features[-1], "__getitem__") and len(model.features[-1]) > 0:
                self.target_layer = model.features[-1][0]
            else:
                self.target_layer = model.features[-1]
        else:
            self.target_layer = target_layer

        self.gradients = None
        self.activations = None

        # Register forward and backward hooks
        self.target_layer.register_forward_hook(self._forward_hook)
        self.target_layer.register_full_backward_hook(self._backward_hook)

    def _forward_hook(self, module, input, output):
        self.activations = output

    def _backward_hook(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def generate_heatmap(
        self,
        face_tensor: torch.Tensor,
        spec_tensor: Optional[torch.Tensor] = None,
        target_class: int = 0
    ) -> np.ndarray:
        """
        Computes normalized Grad-CAM heatmap (H, W) in [0.0, 1.0] for face_tensor (1, 3, 224, 224).
        """
        self.model.eval()
        self.model.zero_grad()

        with torch.enable_grad():
            x = face_tensor.clone().detach().requires_grad_(True)
            spec = spec_tensor.clone().detach() if spec_tensor is not None else None

            # Forward pass
            logits, _ = self.model(x, spec)
            score = logits[0, target_class] if logits.shape[-1] > 1 else logits.squeeze()

            # Backward pass to compute gradients
            score.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            # Fallback uniform heatmap
            return np.ones((224, 224), dtype=np.float32) * 0.5

        # Global average pooling of gradients
        weights = torch.mean(self.gradients, dim=(2, 3), keepdim=True)  # (1, C, 1, 1)

        # Weighted combination of activation maps
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)  # (1, 1, h, w)
        cam = F.relu(cam)

        # Upsample to input face dimensions (224, 224)
        cam = F.interpolate(cam, size=(224, 224), mode='bilinear', align_corners=False)
        cam = cam.squeeze().detach().cpu().numpy()

        # Normalize [0, 1]
        cam_min = float(np.min(cam))
        cam_max = float(np.max(cam))
        rng = cam_max - cam_min
        if rng > 1e-25:
            cam = (cam - cam_min) / rng
        else:
            # Saliency from feature activation energy if pure ReLU was 0
            act_energy = torch.mean(torch.abs(self.activations), dim=1, keepdim=True)
            act_energy = F.interpolate(act_energy, size=(224, 224), mode='bilinear', align_corners=False)
            cam = act_energy.squeeze().detach().cpu().numpy()
            rng_act = float(cam.max() - cam.min())
            if rng_act > 1e-25:
                cam = (cam - cam.min()) / rng_act
            else:
                cam = np.zeros_like(cam)

        return cam.astype(np.float32)

    @staticmethod
    def overlay_heatmap(
        face_rgb: np.ndarray,
        heatmap: np.ndarray,
        alpha: float = 0.55,
        colormap: int = cv2.COLORMAP_JET
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Overlays heatmap on face_rgb (224, 224, 3) in [0, 255].
        Returns (heatmap_rgb, overlay_rgb) in range [0, 255].
        """
        # Convert heatmap to uint8 colormap
        heatmap_uint8 = np.uint8(255 * heatmap)
        heatmap_colored_bgr = cv2.applyColorMap(heatmap_uint8, colormap)
        heatmap_colored_rgb = cv2.cvtColor(heatmap_colored_bgr, cv2.COLOR_BGR2RGB)

        # Blend
        overlay = cv2.addWeighted(face_rgb, 1.0 - alpha, heatmap_colored_rgb, alpha, 0)
        return heatmap_colored_rgb, overlay
