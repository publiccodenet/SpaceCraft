using UnityEngine;
using UnityEngine.EventSystems;

/// <summary>
/// Handles click detection for items and forwards to SpaceCraft
/// </summary>
[RequireComponent(typeof(ItemView))]
public class ItemSelectionHandler : MonoBehaviour, IPointerClickHandler
{
    [SerializeField] private bool _triggerOnClick = true;
    
    private ItemView _itemView;
    private SpaceCraft _spaceCraft;
    
    private void Awake()
    {
        _itemView = GetComponent<ItemView>();
        _spaceCraft = SpaceCraft.spaceCraft;
    }
    
    public void OnPointerClick(PointerEventData eventData)
    {
        if (_triggerOnClick && _itemView != null && _itemView.Model != null && _spaceCraft != null)
        {
            // Simply pass the click to SpaceCraft to handle
            _spaceCraft.ToggleItemSelection("ui_click", "UI Click", _itemView.Model.Id);
        }
    }
} 